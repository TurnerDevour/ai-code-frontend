/**
 * 应用部署：状态文案与错误提示工具。
 * 状态机（对应后端 DeployStatusEnum）：
 *   idle -> queued -> deploying -> ready / failed
 * 其中 queued 与 deploying 都算「进行中」，需要继续轮询；ready / failed 为终态。
 */
import { DEPLOY_STATUS, getDeployStatusMeta } from '@/constant/deploy'

/**
 * 接口生成的 DeployStatusVO 类型之外，后端还回传了 `deployStale` 字段
 * （「已部署的产物是否落后于当前代码」）。
 * 生成的类型文件由工具维护，这里不改它，用一个本地扩展类型把它读出来。
 */
export type DeployStatusWithStale = API.DeployStatusVO & { deployStale?: boolean }

/** 读取「代码已更新、需要重新部署」的标记 */
export const isDeployStale = (deployStatus?: DeployStatusWithStale | null) =>
  deployStatus?.status === DEPLOY_STATUS.READY && deployStatus.deployStale === true

/** 状态标签的简短文案：「排队中」补位次；已部署但有代码更新时补「(有更新)」 */
export const formatDeployStatusLabel = (
  status?: string | null,
  queuePosition?: number | null,
  stale?: boolean,
) => {
  const meta = getDeployStatusMeta(status)
  if (status === DEPLOY_STATUS.QUEUED && typeof queuePosition === 'number' && queuePosition > 0) {
    return `${meta.label}(第 ${queuePosition} 位)`
  }
  if (status === DEPLOY_STATUS.READY && stale) {
    return '已部署(有更新)'
  }
  return meta.label
}

/** 部署状态的悬浮说明：排队中给出位次与并发信息，失败时给出失败原因 */
export const describeDeployStatus = (deployStatus?: DeployStatusWithStale | null) => {
  if (!deployStatus?.status) {
    return ''
  }
  switch (deployStatus.status) {
    case DEPLOY_STATUS.QUEUED: {
      const details: string[] = []
      if (typeof deployStatus.queuePosition === 'number') {
        details.push(`当前第 ${deployStatus.queuePosition} 位`)
      }
      if (typeof deployStatus.queueSize === 'number') {
        details.push(`共 ${deployStatus.queueSize} 个等待`)
      }
      if (typeof deployStatus.workerCount === 'number') {
        details.push(`同时最多构建 ${deployStatus.workerCount} 个`)
      }
      const detailText = details.length ? `（${details.join('，')}）` : ''
      return `${deployStatus.message || '部署任务已提交，正在排队等待构建'}${detailText}`
    }
    case DEPLOY_STATUS.DEPLOYING:
      return deployStatus.message || '正在执行 npm install 与构建，可以离开页面，稍后回来查看进度'
    case DEPLOY_STATUS.READY:
      if (deployStatus.deployUrl) {
        const base = `部署地址：${deployStatus.deployUrl}（点击可打开）`
        return deployStatus.deployStale
          ? `${base}。你修改过代码，重新部署后这里才会是最新内容`
          : base
      }
      return '该应用已部署完成'
    case DEPLOY_STATUS.FAILED:
      return deployStatus.errorMessage || deployStatus.message || '部署失败，可重新部署'
    default:
      return deployStatus.message || '尚未部署'
  }
}

/**
 * 提取部署失败的提示文案
 * 优先后端下发的 message（队列满、同步部署额度超时等都是 code=50000 + 可直接展示的文案），
 * 再退回异常信息，最后给通用兜底文案。
 */
export const resolveDeployErrorMessage = (error: unknown) => {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }
  const errorMessage = (error as Error)?.message
  if (typeof errorMessage === 'string' && errorMessage.trim()) {
    return errorMessage
  }
  return '部署失败，请稍后重试'
}
