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
 * 生成请求必须挂在 store 上：放在组件里并在 onBeforeUnmount abort，用户点返回就掐断连接，
 * 服务端仍在生成却不在对话历史里留这一轮回复，用户看到"空回复"。
 *
 * 后端（VUE_PROJECT）已把生成与连接解耦：每帧带 SSE `id`（帧序号），刷新/断网后调
 * `/app/chat/gen/resume?fromSeq=已收到的序号` 续订，服务端先补发缺失帧再实时推送，零丢失零重复。
 * 只有切换应用、用户主动停止时才真正中断。
 */

/** 生成会话状态 */
export type GenerationStatus = 'idle' | 'running' | 'done' | 'error' | 'stopped'

/** 生成会话快照（UI 订阅与回放都用它） */
export interface GenerationSession {
  appId: string
  /**
   * 本轮生成轮次标识（每次 startGeneration 都会变）
   *
   * 会话按 appId 保存，第二轮开始会把 content 重置为空；订阅若只比对 `content.length`，上轮遗留的
   * 订阅会误判成"内容变短"而清空消息。带轮次标识后订阅先比对轮次，不同就直接解绑、不触碰消息。
   */
  roundId: string
  status: GenerationStatus
  /** 累积的展示内容（Markdown 源码） */
  content: string
  /** 累积的 AI 思考过程（reasoning_content）：只进对话页顶部「AI 思考过程」面板，混进正文会夹带推理内容 */
  thinking: string
  /** 已产生的工具执行结果（按到达顺序） */
  toolExecutions: { relativePath: string; content: string }[]
  /** 失败原因（status=error 时） */
  errorMessage: string
  /** 是否已收到后端的 done 事件 */
  doneReceived: boolean
  /** 已收到的最新帧序号（SSE 的 id: 字段），也是续订起点：resume 会补发该序号之后的帧 */
  lastSeq: number
  /** 已应用到内容的最大帧序号：补发与实时推送可能让同一帧到达两次，用它幂等过滤 */
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
 * 会话持久化到 sessionStorage：整页刷新/浏览器"返回上一页"会重建 Pinia 实例、内存会话就没了
 * （实测 history.back/forward 回来内容为空）。sessionStorage 生命周期正是"当前标签页"，与生成可见范围一致。
 */
const STORAGE_PREFIX = 'dsh:generation:'
/** 会话最长保留时间：超过则视为过期（生成早就结束了，没必要继续占存储） */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000
/** 单条会话的持久化上限：超长内容（几十个文件）不落盘，避免撑爆 sessionStorage 配额 */
const MAX_PERSIST_CONTENT = 400_000
/**
 * 思考过程的持久化上限：仅用于 sessionStorage 回放截断（推理模型一轮可能几万字）。
 * 后端 chat_history.thinking 存的是完整内容，刷新页面后仍能从历史里拿全。
 */
const MAX_PERSIST_THINKING = 60_000
/** 流式过程中落盘的最小间隔：每帧都写会明显拖慢渲染 */
const PERSIST_INTERVAL_MS = 1200

const persistSession = (session: GenerationSession) => {
  // 后端渲染时没有 sessionStorage，这里挡掉
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
 * 整页刷新后原来的 fetch 已不存在，故把仍为 running 的会话标记为 stopped（内容保留，页面显示"已中断"
 * 而不是一直转圈），页面再用 resumeGeneration 接回真正的生成。
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
    // 旧快照没有轮次标识，补一个，让「按轮次解绑」的比较逻辑对它同样成立
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

  /** 读取会话：内存里没有时尝试从 sessionStorage 恢复（整页刷新/浏览器返回的场景） */
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
   * 新一轮 startGeneration 会整体替换会话对象，页面用引用比较即可判断自己的订阅是否已过期。
   */
  const getCurrentSession = (appId: string): GenerationSession | null =>
    sessions.value[appId] ?? null

  /** 落盘（节流）：流式过程中最多每 PERSIST_INTERVAL_MS 写一次，关键节点用 immediate 立即写 */
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
      // 思考过程单独累积：只进「AI 思考过程」面板，不进 AI 回复正文
      if (message.data) {
        session.thinking += message.data
      }
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_REQUEST) {
      // 展示文案由后端按工具声明下发（[🔧 选择工具] 修改文件内容 / 写入文件内容 …）；
      // 旧帧没有 display 时才退回工具英文名
      session.content += `\n\n> ${message.display || `[🔧 选择工具] ${message.name}`}\n\n`
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_EXECUTED) {
      const file = parseToolArguments(message.arguments)
      if (file) {
        session.toolExecutions.push(file)
      }
      // 优先用后端给的展示文本：写入是"文件内容"、修改是"修改前后对比"、失败给失败原因。
      // 前端按工具名猜参数结构会把 modifyFile 渲染成"写入文件 + 空代码块"
      if (message.display) {
        session.content += `\n\n${message.display}\n\n`
        return
      }
      // 以下是旧帧（无 display）的兜底。工具调用失败（参数非合法 JSON / 工具名不存在 / 工具内部异常）
      // 时后端照样下发 tool_executed，但文件并没有写入，必须显式展示失败，否则用户以为改写成功了。
      if (message.failed) {
        const reason = message.result || '工具未执行'
        session.content += `\n\n> ⚠️ [工具调用失败] ${message.name}：${reason}\n\n`
        return
      }
      // 解析不出内容时只显示一行工具名，绝不渲染空代码块
      if (!file || !file.content) {
        const target = file?.relativePath ? ` ${file.relativePath}` : ''
        session.content += `\n\n> [🔧 工具调用] ${message.name}${target}\n\n`
        return
      }
      const suffix = file.relativePath.split('.').pop() ?? ''
      const fence = suffix && suffix !== file.relativePath ? suffix : 'text'
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
      // 续订补发与实时推送重叠时同一帧会到两次，跳过以保证不重复渲染
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
   * @param url     首次是 /app/chat/gen/code，续订是 /app/chat/gen/resume
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

  /** 启动生成：已有运行中的会话或正在重连时直接复用，不重复发起请求 */
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
   * 用于整页刷新 / 浏览器返回 / 网络中断后的恢复。
   *
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
   * 会标记为主动停止，与"断网/刷新导致的断开"区分开，不再自动重连。
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
