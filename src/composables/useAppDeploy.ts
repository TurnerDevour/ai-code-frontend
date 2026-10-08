/**
 * 应用异步部署：提交任务 + 轮询状态的组合式函数。
 *
 * 后端把「构建」（npm install + build，几十秒~几分钟）放进部署队列异步执行：
 *   POST /app/deploy/async  毫秒级返回 DeployStatusVO（accepted=true 表示本次被受理，status=queued）
 *   GET  /app/deploy/status 查询状态，queued / deploying 都算「进行中」，需继续轮询
 * 轮询到 ready/failed，带超时保护，页面隐藏时暂停，切换应用或卸载时停止。
 */
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import { getDeployStatus, submitDeployApp } from '@/api/appController'
import { DEPLOY_STATUS, isDeployInProgress, type DeployStatus } from '@/constant/deploy'
import { describeDeployStatus, isDeployStale, type DeployStatusWithStale } from '@/utils/deploy'

/** 轮询间隔 1.5s */
const POLL_INTERVAL_MS = 1500
/** 轮询总超时 15 分钟，覆盖首次 npm install 偏慢的情况 */
const POLL_TIMEOUT_MS = 15 * 60 * 1000
/** 未登录：拦截器已跳转登录页，这里停止轮询避免死循环 */
const UNAUTHORIZED_CODE = 40100

export interface UseAppDeployReturn {
  deployStatus: Ref<DeployStatusWithStale | null>
  /** idle / queued / deploying / ready / failed */
  deployStatusValue: ComputedRef<DeployStatus | undefined>
  /** 提交请求或轮询进行中：部署按钮的 loading */
  deploying: ComputedRef<boolean>
  inProgress: ComputedRef<boolean>
  /** 仅 status=ready 有值 */
  deployUrl: ComputedRef<string>
  statusTip: ComputedRef<string>
  stale: ComputedRef<boolean>
  /**
   * 部署按钮是否置灰
   * 只在「进行中」以及「已部署且代码没改动」时置灰：已部署后代码又改过必须允许重新部署，
   * 否则用户改完应用只能一直看旧站点。
   */
  disabled: ComputedRef<boolean>
  /** 部署 / 已部署 / 重新部署 */
  buttonText: ComputedRef<string>
  /** 提交失败抛异常，由调用方提示 */
  deploy: () => Promise<void>
  syncStatus: () => Promise<void>
  stop: () => void
}

/** 页面隐藏时不必持续请求 */
const isPageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

export const useAppDeploy = (appId: Ref<string>): UseAppDeployReturn => {
  const deployStatus = ref<DeployStatusWithStale | null>(null)
  const submitting = ref(false)
  /** 是否在轮询中：与 submitting 一起决定部署按钮 loading */
  const polling = ref(false)
  let pollTimer: number | null = null
  let pollDeadline = 0
  /** 页面隐藏的开始时间：隐藏期间不计入超时 */
  let hiddenSince = 0
  /** 轮询代次：停止 / 重启时递增，让上一轮尚未返回的回调失效 */
  let pollGeneration = 0

  const deploying = computed(() => submitting.value || polling.value)
  const deployStatusValue = computed<DeployStatus | undefined>(
    () => deployStatus.value?.status as DeployStatus | undefined,
  )
  const inProgress = computed(() => isDeployInProgress(deployStatus.value?.status))
  const deployUrl = computed(() => deployStatus.value?.deployUrl ?? '')
  const statusTip = computed(() => describeDeployStatus(deployStatus.value))
  const stale = computed(() => isDeployStale(deployStatus.value))

  /**
   * 部署按钮是否置灰
   * 只在「进行中」以及「已部署且代码没改动」时置灰；代码改过（stale）时允许重新部署，
   * 否则「先部署 -> 再用 AI 改代码」之后按钮会一直是灰的「已部署」，用户点不动。
   */
  const disabled = computed(
    () => inProgress.value || (deployStatusValue.value === DEPLOY_STATUS.READY && !stale.value),
  )

  /** 已部署（代码无改动）、重新部署（有更新 / 上次失败）、部署（未部署） */
  const buttonText = computed(() => {
    switch (deployStatusValue.value) {
      case DEPLOY_STATUS.READY:
        return stale.value ? '重新部署' : '已部署'
      case DEPLOY_STATUS.FAILED:
        return '重新部署'
      default:
        return '部署'
    }
  })

  // 切换应用后旧应用的状态与轮询都不再适用
  watch(appId, () => {
    stop()
    deployStatus.value = null
  })

  /** 停止轮询并让在途请求的结果失效 */
  function stop() {
    pollGeneration += 1
    polling.value = false
    hiddenSince = 0
    if (pollTimer !== null) {
      window.clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  /** 部署完成后提示访问地址，并尽量复制到剪贴板（与旧同步部署体验一致） */
  const handleDeployReady = async (data: DeployStatusWithStale) => {
    const url = data.deployUrl ?? ''
    if (!url) {
      message.success('部署成功').then(() => {})
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      message.success('部署成功，访问地址已复制到剪贴板').then(() => {})
    } catch {
      message.success('部署成功：' + url, 6).then(() => {})
    }
  }

  const schedulePoll = (generation: number) => {
    pollTimer = window.setTimeout(() => {
      pollTimer = null
      void pollOnce(generation)
    }, POLL_INTERVAL_MS)
  }

  /** 开始轮询：先清掉上一轮，再设定本次超时时间 */
  const startPolling = () => {
    stop()
    pollDeadline = Date.now() + POLL_TIMEOUT_MS
    polling.value = true
    schedulePoll(pollGeneration)
  }

  /** 查询一次状态：终态则收尾，否则按间隔继续；单次失败不终止轮询 */
  const pollOnce = async (generation: number) => {
    if (generation !== pollGeneration) {
      return
    }
    // 页面隐藏时只保留节奏、不发请求；恢复可见后把隐藏时长顺延给超时时间
    if (isPageHidden()) {
      hiddenSince = hiddenSince || Date.now()
      schedulePoll(generation)
      return
    }
    if (hiddenSince) {
      pollDeadline += Date.now() - hiddenSince
      hiddenSince = 0
    }
    try {
      const res = await getDeployStatus({ appId: appId.value })
      if (generation !== pollGeneration) {
        return
      }
      const { code, data, message: responseMessage } = res.data
      if (code === UNAUTHORIZED_CODE) {
        stop()
        return
      }
      if (code !== 0 || !data) {
        console.warn('[deploy] 查询部署状态失败：', responseMessage)
      } else {
        deployStatus.value = data
        if (data.status === DEPLOY_STATUS.READY) {
          stop()
          await handleDeployReady(data)
          return
        }
        if (data.status === DEPLOY_STATUS.FAILED) {
          stop()
          message.error(data.errorMessage || data.message || '部署失败，请重试').then(() => {})
          return
        }
      }
    } catch (error) {
      if (generation !== pollGeneration) {
        return
      }
      console.warn('[deploy] 查询部署状态异常：', error)
    }
    if (Date.now() > pollDeadline) {
      stop()
      message.warning('部署超时，请稍后在应用详情查看部署状态').then(() => {})
      return
    }
    schedulePoll(generation)
  }

  /**
   * 提交异步部署：毫秒级返回，随后按需轮询
   * 失败（如队列已满 code=50000）通过异常抛出，由调用方用后端 message 提示
   */
  const deploy = async () => {
    const currentAppId = appId.value
    if (!currentAppId || deploying.value) {
      return
    }
    submitting.value = true
    try {
      const res = await submitDeployApp({ appId: currentAppId })
      // 提交期间切换了应用则丢弃本次结果
      if (appId.value !== currentAppId) {
        return
      }
      if (res.data.code !== 0 || !res.data.data) {
        throw new Error(res.data.message || '提交部署失败')
      }
      const data = res.data.data
      deployStatus.value = data

      // ① 本次没被受理：可能「已经在部署」或「之前已部署完成」
      if (data.accepted === false) {
        if (data.status === DEPLOY_STATUS.READY && data.deployUrl) {
          // 已部署 + 代码没改动：后端会拒绝重复提交，这里如实告知。
          // （代码改过时后端会受理本次重新部署，不会走到这个分支）
          message.info('该应用已经部署完成，且代码没有新的改动').then(() => {})
          return
        }
        if (data.status === DEPLOY_STATUS.FAILED) {
          message.error(data.errorMessage || '上次部署失败，请重试').then(() => {})
          return
        }
        // queued / deploying：已有任务在跑，进入轮询
      } else {
        message.info(data.message || '部署任务已提交，正在排队构建').then(() => {})
      }

      // ② 只有「进行中」才需要轮询；未被受理且当前空闲时不轮询，避免空转到超时
      if (isDeployInProgress(data.status) || data.accepted === true) {
        startPolling()
      }
    } finally {
      submitting.value = false
    }
  }

  /** 进入应用详情 / 刷新页面后同步状态，进行中则恢复轮询 */
  const syncStatus = async () => {
    const currentAppId = appId.value
    if (!currentAppId) {
      return
    }
    try {
      const res = await getDeployStatus({ appId: currentAppId })
      // 请求期间切换了应用则丢弃本次结果
      if (appId.value !== currentAppId) {
        return
      }
      if (res.data.code === UNAUTHORIZED_CODE) {
        stop()
        return
      }
      if (res.data.code !== 0 || !res.data.data) {
        // 状态查询失败不影响页面使用，静默处理
        return
      }
      deployStatus.value = res.data.data
      if (isDeployInProgress(res.data.data.status)) {
        startPolling()
      }
    } catch (error) {
      console.warn('[deploy] 同步部署状态失败：', error)
    }
  }

  // 兜底清理，避免定时器泄漏
  onScopeDispose(stop)

  return {
    deployStatus,
    deployStatusValue,
    deploying,
    inProgress,
    deployUrl,
    statusTip,
    stale,
    disabled,
    buttonText,
    deploy,
    syncStatus,
    stop,
  }
}
