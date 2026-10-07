import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { streamSse } from '@/utils/sse'
import {
  STREAM_MESSAGE_TYPE,
  parseStreamMessage,
  parseToolArguments,
  type ParsedStreamMessage,
} from '@/utils/streamMessage'

/**
 * AI 生成会话（全局、不随组件卸载中断）
 *
 * 背景：原来生成请求由页面组件发起，并在 onBeforeUnmount 里 abort。
 * 用户点返回按钮时连接被掐断，于是：
 *   - 服务端虽然会继续生成（工具已经把文件写进磁盘），但对话历史里没有这一轮 AI 回复；
 *   - 用户回到页面看到的是"空回复"，而且 AI 后续追问"不记得"生成过什么。
 *
 * 现在的做法：
 *   - 生成请求挂在这个 store 上（Pinia 实例不随路由卸载销毁），路由离开只解除 UI 订阅（方案 A）；
 *   - 内容与工具消息在此累积，会话快照落到 sessionStorage，整页刷新/浏览器返回后仍能恢复；
 *   - 后端（VUE_PROJECT）已把生成过程与客户端连接解耦：每个数据帧带 SSE `id`（帧序号），
 *     客户端刷新/断网回来后调用 `/app/chat/gen/resume?fromSeq=已收到的序号` 续订，
 *     服务端先补发缺失的帧再继续实时推送，因此零丢失、零重复；
 *   - 只有切换应用、用户主动停止时才真正中断。
 *
 * 注意：HTTP 请求的发起与重连都在 store 里，组件卸载只解除自己的订阅，不影响生成本身。
 */

/** 生成会话状态 */
export type GenerationStatus = 'idle' | 'running' | 'done' | 'error' | 'stopped'

/** 生成会话快照（UI 订阅与回放都用它） */
export interface GenerationSession {
  appId: string
  /**
   * 本轮生成轮次标识（每次 startGeneration 都会变）
   *
   * 为什么需要它：会话按 appId 保存，第 2 轮开始时会把 content 重置为空。
   * 如果 UI 只按 `content.length` 判断增量，上一轮遗留的订阅会把"长度从 0 重新增长"
   * 误判成"内容变短了"，于是第一轮消息被清空、又被第二轮的流重新填满（表现为
   * 第一轮内容突然消失，随后跟着第二轮一起流式生成，甚至两条都变空白）。
   * 带上轮次标识后，订阅先比对轮次：轮次不同就直接解绑，不触碰任何消息。
   */
  roundId: string
  /** 当前状态 */
  status: GenerationStatus
  /** 累积的展示内容（Markdown 源码） */
  content: string
  /**
   * 累积的 AI 思考过程（推理模型的 reasoning_content）
   *
   * 与 content 分开累积：它展示在对话页顶部的「AI 思考过程」面板里，
   * 混进正文会让 AI 回复里夹着大段推理内容（后端也是单独一列落库的）。
   */
  thinking: string
  /** 已产生的工具执行结果（按到达顺序） */
  toolExecutions: { relativePath: string; content: string }[]
  /** 失败原因（status=error 时） */
  errorMessage: string
  /** 是否已收到后端的 done 事件 */
  doneReceived: boolean
  /**
   * 已收到的最新帧序号（取自 SSE 的 id: 字段）
   * 它是续订的起点：/app/chat/gen/resume?fromSeq= 会补发该序号之后的帧。
   */
  lastSeq: number
  /**
   * 已应用到内容里的最大帧序号
   * 续订补发与实时推送可能让同一帧到达两次，用它做幂等过滤，保证不重复渲染。
   */
  appliedSeq: number
  /** 开始时间戳 */
  startedAt: number
  /** 结束时间戳（未结束时为 0） */
  finishedAt: number
  /** 最近一次收到帧的时间戳：用于判断连接是否已经断了 */
  lastFrameAt: number
}

/** 轮次标识自增种子：同一毫秒内的两轮也不会重号 */
let roundSeed = 0

const createSession = (appId: string): GenerationSession => ({
  appId,
  roundId: `round-${Date.now()}-${++roundSeed}`,
  status: 'running',
  content: '',
  thinking: '',
  toolExecutions: [],
  errorMessage: '',
  doneReceived: false,
  lastSeq: 0,
  appliedSeq: 0,
  startedAt: Date.now(),
  finishedAt: 0,
  lastFrameAt: Date.now(),
})

/**
 * 会话持久化：写入 sessionStorage
 *
 * 为什么需要：浏览器"返回上一页"或刷新会整页重新加载，Pinia 实例被重建、内存里的会话就没了
 * （实测：离开页面后 history.back/forward 回来，内容为空）。
 * sessionStorage 的生命周期正好是"当前标签页"，与生成过程的可见范围一致：
 * 同标签页内返回/刷新能恢复内容，关掉标签页即清理。
 */
const STORAGE_PREFIX = 'dsh:generation:'
/** 会话最长保留时间：超过则视为过期（生成早就结束了，没必要继续占存储） */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000
/** 单条会话的持久化上限：超长内容（几十个文件）不落盘，避免撑爆 sessionStorage 配额 */
const MAX_PERSIST_CONTENT = 400_000
/**
 * 思考过程的持久化上限
 *
 * 思考过程可能很长（推理模型一轮几万字），这里只用于 sessionStorage 回放截断；
 * 后端 chat_history.thinking 存的是完整内容，刷新页面后仍能从历史里拿全。
 */
const MAX_PERSIST_THINKING = 60_000
/** 流式过程中落盘的最小间隔：每帧都写会明显拖慢渲染 */
const PERSIST_INTERVAL_MS = 1200

const persistSession = (session: GenerationSession) => {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  const thinking =
    session.thinking.length > MAX_PERSIST_THINKING
      ? session.thinking.slice(0, MAX_PERSIST_THINKING)
      : session.thinking
  try {
    if (session.content.length > MAX_PERSIST_CONTENT) {
      // 内容过大：只保存状态与序号，不保存正文（正文仍可从后端对话历史看到）
      sessionStorage.setItem(
        STORAGE_PREFIX + session.appId,
        JSON.stringify({ ...session, content: '', toolExecutions: [], thinking, persistTruncated: true }),
      )
      return
    }
    sessionStorage.setItem(STORAGE_PREFIX + session.appId, JSON.stringify({ ...session, thinking }))
  } catch {
    // 配额不足等问题不影响主流程
  }
}

const removePersistedSession = (appId: string) => {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + appId)
  } catch {
    /* 忽略 */
  }
}

/**
 * 恢复某个应用上次未清理的会话
 *
 * 整页刷新后原来的 fetch 已经不存在了，因此把仍在 running 的会话标记为 stopped
 * （内容保留，页面据此展示"已中断"而不是一直转圈）；
 * 页面随后会用 resumeGeneration 通过 resume 接口把真正的生成接回来。
 *
 * @param appId 应用 id
 */
const restoreSession = (appId: string): GenerationSession | null => {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + appId)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as GenerationSession & { persistTruncated?: boolean }
    if (!parsed || parsed.appId !== appId) {
      return null
    }
    if (Date.now() - (parsed.startedAt ?? 0) > SESSION_TTL_MS) {
      removePersistedSession(appId)
      return null
    }
    // 兼容旧快照：补齐后来新增的字段
    parsed.lastSeq = parsed.lastSeq ?? 0
    parsed.appliedSeq = parsed.appliedSeq ?? 0
    parsed.lastFrameAt = parsed.lastFrameAt ?? parsed.startedAt ?? Date.now()
    parsed.thinking = parsed.thinking ?? ''
    // 旧快照没有轮次标识：补一个，保证「按轮次解绑」的比较逻辑对它同样成立
    parsed.roundId = parsed.roundId ?? `round-restored-${parsed.startedAt ?? Date.now()}`
    if (parsed.status === 'running') {
      parsed.status = 'stopped'
      parsed.errorMessage = ''
      parsed.finishedAt = parsed.finishedAt || Date.now()
    }
    delete parsed.persistTruncated
    return parsed
  } catch {
    return null
  }
}

/** 重连退避：第 n 次失败后等待的毫秒数 */
const RECONNECT_DELAYS_MS = [800, 1500, 3000, 5000, 8000]
/** 最多重连次数，避免后端一直不可用时无限重试 */
const MAX_RECONNECT_ATTEMPTS = 5

export const useGenerationStore = defineStore('generation', () => {
  /** appId -> 会话 */
  const sessions = ref<Record<string, GenerationSession>>({})
  /** 当前活动的生成请求控制器：appId -> AbortController */
  const controllers = new Map<string, AbortController>()
  /** 用户主动停止的会话：与"断网/刷新导致的断开"区分开，后者会自动续订 */
  const manualStops = new Set<string>()
  /** 正在等待重连的应用：避免重复发起续订 */
  const reconnecting = new Set<string>()
  /** 上次落盘时间：用于节流 */
  const lastPersistAt = new Map<string, number>()

  /** 某应用是否正在生成 */
  const isGenerating = (appId: string) => sessions.value[appId]?.status === 'running'

  /** 任意应用是否正在生成（用于全局提示） */
  const hasRunningSession = computed(() =>
    Object.values(sessions.value).some((session) => session.status === 'running'),
  )

  /** 读取会话：内存里没有时尝试从 sessionStorage 恢复（整页刷新/浏览器返回按钮的场景） */
  const getSession = (appId: string): GenerationSession | null => {
    const inMemory = sessions.value[appId]
    if (inMemory) {
      return inMemory
    }
    const restored = restoreSession(appId)
    if (restored) {
      sessions.value[appId] = restored
      return restored
    }
    return null
  }

  /**
   * 读取「当前这一轮」会话（不做落盘恢复）
   *
   * 页面用它区分「我正在订阅的那一轮」是否已经被新一轮替换：
   * 新一轮 startGeneration 会整体替换会话对象，因此引用比较即可判断订阅是否过期。
   *
   * @param appId 应用 id
   *
   * @returns 当前会话（没有则为 null）
   */
  const getCurrentSession = (appId: string): GenerationSession | null =>
    sessions.value[appId] ?? null

  /**
   * 落盘（节流）：流式过程中最多每 PERSIST_INTERVAL_MS 写一次，
   * 关键节点（开始/结束/状态变化）用 immediate 立即写。
   */
  const schedulePersist = (session: GenerationSession, immediate = false) => {
    const now = Date.now()
    const last = lastPersistAt.get(session.appId) ?? 0
    if (immediate || now - last >= PERSIST_INTERVAL_MS) {
      lastPersistAt.set(session.appId, now)
      persistSession(session)
    }
  }

  /** 处理一条 VUE_PROJECT 的 JSON 消息 */
  const applyStreamMessage = (session: GenerationSession, message: ParsedStreamMessage) => {
    if (message.type === STREAM_MESSAGE_TYPE.AI_RESPONSE) {
      if (message.data) {
        session.content += message.data
      }
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.AI_THINKING) {
      // 思考过程单独累积：它只进「AI 思考过程」面板，不进 AI 回复正文
      if (message.data) {
        session.thinking += message.data
      }
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_REQUEST) {
      session.content += '\n\n> [🔧 选择工具] 写入文件\n\n'
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_EXECUTED) {
      // 工具调用失败（参数不是合法 JSON / 工具名不存在 / 工具内部异常）时后端照样会下发
      // tool_executed，但**文件并没有写入**。必须显式展示失败，否则用户会以为改写成功了。
      if (message.failed) {
        const reason = message.result || '工具未执行'
        session.content += `\n\n> ⚠️ [工具调用失败] ${message.name}：${reason}\n\n`
        return
      }
      const file = parseToolArguments(message.arguments)
      if (!file) {
        return
      }
      const suffix = file.relativePath.split('.').pop() ?? ''
      const fence = suffix && suffix !== file.relativePath ? suffix : 'text'
      session.toolExecutions.push(file)
      session.content += `\n\n[🔧 工具调用] 写入文件 ${file.relativePath}\n\n\`\`\`${fence}\n${file.content}\n\`\`\`\n\n`
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.ERROR) {
      session.status = 'error'
      session.errorMessage = message.data || '生成失败，请重试'
      session.finishedAt = Date.now()
    }
  }

  /** 应用一帧数据到会话（按帧序号幂等：重复帧直接丢弃） */
  const applyFrame = (
    session: GenerationSession,
    frame: { id?: string; event?: string; data: unknown },
  ) => {
    const seq = Number(frame.id)
    const hasSeq = frame.id !== undefined && frame.id !== '' && !Number.isNaN(seq)
    if (hasSeq && seq <= session.appliedSeq) {
      // 续订补发与实时推送重叠时同一帧会到达两次，这里跳过，保证不重复渲染
      return
    }
    if (hasSeq) {
      session.lastSeq = Math.max(session.lastSeq, seq)
    }
    session.lastFrameAt = Date.now()
    if (frame.event === 'done') {
      session.doneReceived = true
      schedulePersist(session, true)
      return
    }
    const message = parseStreamMessage(frame.data)
    if (message) {
      applyStreamMessage(session, message)
    } else {
      // HTML / 多文件模式是纯文本增量（兼容 {d: '...'} 包装）
      const payload = frame.data as unknown
      const chunk =
        typeof payload === 'string'
          ? payload
          : payload && typeof (payload as { d?: unknown }).d === 'string'
            ? (payload as { d: string }).d
            : ''
      if (chunk) {
        session.content += chunk
      }
    }
    if (hasSeq) {
      session.appliedSeq = seq
    }
    schedulePersist(session)
  }

  /** 连接结束时的状态收口 */
  const settleSession = (session: GenerationSession, aborted: boolean) => {
    if (session.status === 'running') {
      if (session.doneReceived) {
        session.status = 'done'
      } else if (aborted) {
        // 主动中断（切换应用/用户停止）：保留已生成内容
        session.status = 'stopped'
      } else {
        session.status = 'error'
        session.errorMessage = '生成连接已中断，请重试'
      }
      session.finishedAt = Date.now()
    }
    schedulePersist(session, true)
    controllers.delete(session.appId)
  }

  /**
   * 发起（或续订）生成流
   *
   * @param session 会话
   * @param url     请求地址：首次是 /app/chat/gen/code，续订是 /app/chat/gen/resume
   * @param params  查询参数
   * @param attempt 当前重连次数（0 表示首次连接）
   */
  const runGeneration = (
    session: GenerationSession,
    url: string,
    params: Record<string, string | number>,
    attempt: number,
  ) => {
    const appId = session.appId
    const controller = controllers.get(appId)
    if (!controller) {
      return
    }
    void streamSse<unknown>({
      url,
      params,
      abortController: controller,
      onMessage: (event) => applyFrame(session, event),
      onClose: () => {
        controllers.delete(appId)
        // 主动停止 / 收到 done / 已失败：直接收口
        if (session.status !== 'running' || manualStops.has(appId) || session.doneReceived) {
          settleSession(session, controller.signal.aborted)
          return
        }
        // 连接意外断开：自动续订。服务端的生成是独立的，这里只是把订阅接回来
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]
          reconnecting.add(appId)
          session.errorMessage = ''
          schedulePersist(session)
          window.setTimeout(() => {
            reconnecting.delete(appId)
            if (manualStops.has(appId) || session.status !== 'running') {
              return
            }
            controllers.set(appId, new AbortController())
            runGeneration(
              session,
              '/app/chat/gen/resume',
              { appId, fromSeq: session.lastSeq },
              attempt + 1,
            )
          }, delay)
          return
        }
        session.status = 'error'
        session.errorMessage = '生成连接多次中断，请重试'
        session.finishedAt = Date.now()
        schedulePersist(session, true)
      },
    })
  }

  /**
   * 启动生成：已存在运行中的会话时直接复用，不会重复发起请求
   *
   * @param appId  应用 id
   * @param prompt 提示词
   */
  const startGeneration = (appId: string, prompt: string) => {
    if (isGenerating(appId) || reconnecting.has(appId)) {
      return
    }
    manualStops.delete(appId)
    controllers.set(appId, new AbortController())
    sessions.value[appId] = createSession(appId)
    const session = sessions.value[appId]
    // 立刻落一份：用户可能刚发出消息就刷新页面，也要能恢复出"这条生成存在"
    schedulePersist(session, true)
    runGeneration(session, '/app/chat/gen/code', { appId, prompt }, 0)
  }

  /**
   * 续订：把"服务端仍在生成、但本地连接已断"的任务接回来
   *
   * 用于整页刷新 / 浏览器返回 / 网络中断后的恢复。服务端会先补发 fromSeq 之后的帧
   * （按帧序号幂等，重复的不会应用），再继续实时推送。
   *
   * @param appId 应用 id
   * @returns 是否真的发起了续订
   */
  const resumeGeneration = (appId: string): boolean => {
    const session = sessions.value[appId] ?? restoreSession(appId)
    if (!session) {
      return false
    }
    sessions.value[appId] = session
    if (reconnecting.has(appId) || controllers.has(appId)) {
      return false
    }
    // 已经结束的会话不需要续订
    if (session.status === 'done' || session.status === 'error' || session.doneReceived) {
      return false
    }
    manualStops.delete(appId)
    session.status = 'running'
    session.errorMessage = ''
    session.finishedAt = 0
    controllers.set(appId, new AbortController())
    schedulePersist(session, true)
    runGeneration(session, '/app/chat/gen/resume', { appId, fromSeq: session.lastSeq }, 0)
    return true
  }

  /**
   * 中断某个应用的生成（切换应用时用；用户主动"停止生成"也走这里）
   *
   * 与"断网/刷新导致的断开"不同：这里会标记为主动停止，不再自动重连。
   *
   * @param appId 应用 id
   */
  const abortGeneration = (appId: string) => {
    manualStops.add(appId)
    const controller = controllers.get(appId)
    if (controller) {
      controller.abort()
      controllers.delete(appId)
    }
    const session = sessions.value[appId]
    if (session && session.status === 'running') {
      session.status = 'stopped'
      session.finishedAt = Date.now()
      schedulePersist(session, true)
    }
  }

  /** 清空某个应用的会话（例如重新初始化页面时） */
  const clearSession = (appId: string) => {
    abortGeneration(appId)
    delete sessions.value[appId]
    removePersistedSession(appId)
    lastPersistAt.delete(appId)
  }

  return {
    sessions,
    hasRunningSession,
    isGenerating,
    getSession,
    getCurrentSession,
    startGeneration,
    resumeGeneration,
    abortGeneration,
    clearSession,
  }
})
