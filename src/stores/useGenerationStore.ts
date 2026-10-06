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
 * 现在的做法（方案 A）：
 *   - 生成请求挂在这个 store 上（Pinia 实例不随路由卸载销毁），路由离开只解除 UI 订阅；
 *   - 内容与工具消息在此累积，任何时刻重新订阅都能拿到"到目前为止的全部内容"；
 *   - 生成结束后状态保存在 store 里，用户回到页面可以直接看到结果；
 *   - 只有切换应用、用户主动停止、或后端报错时才真正中断。
 *
 * 注意：这不改变"服务端会继续生成"的事实，只是让前端把这一轮的结果接住；
 * 服务端的兜底落库见后端 GenerationCompletionHandler（客户端断开也会写入带中断标记的 AI 消息）。
 */

/** 生成会话状态 */
export type GenerationStatus = 'idle' | 'running' | 'done' | 'error' | 'stopped'

/** 生成会话快照（UI 订阅与回放都用它） */
export interface GenerationSession {
  appId: string
  /** 当前状态 */
  status: GenerationStatus
  /** 累积的展示内容（Markdown 源码） */
  content: string
  /** 已产生的工具执行结果（按到达顺序） */
  toolExecutions: { relativePath: string; content: string }[]
  /** 失败原因（status=error 时） */
  errorMessage: string
  /** 是否已收到后端的 done 事件 */
  doneReceived: boolean
  /** 开始时间戳 */
  startedAt: number
  /** 结束时间戳（未结束时为 0） */
  finishedAt: number
}

const createSession = (appId: string): GenerationSession => ({
  appId,
  status: 'running',
  content: '',
  toolExecutions: [],
  errorMessage: '',
  doneReceived: false,
  startedAt: Date.now(),
  finishedAt: 0,
})

/**
 * 会话持久化：写入 sessionStorage
 *
 * 为什么需要：浏览器"返回上一页"或刷新会**整页重新加载**，Pinia 实例被重建、内存里的会话就没了
 * （实测：离开页面后 history.back/forward 回来，内容为空）。
 * sessionStorage 的生命周期正好是"当前标签页"，与生成过程的可见范围一致：
 * 同标签页内返回/刷新能恢复内容，关掉标签页即清理。
 */
const STORAGE_PREFIX = 'dsh:generation:'
/** 会话最长保留时间：超过则视为过期（生成早就结束了，没必要继续占存储） */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000
/** 单条会话的持久化上限：超长内容（几十个文件）不落盘，避免撑爆 sessionStorage 配额 */
const MAX_PERSIST_CONTENT = 400_000

const persistSession = (session: GenerationSession) => {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    if (session.content.length > MAX_PERSIST_CONTENT) {
      // 内容过大：只保存状态，不保存正文（正文仍可从后端对话历史看到）
      sessionStorage.setItem(
        STORAGE_PREFIX + session.appId,
        JSON.stringify({ ...session, content: '', toolExecutions: [], persistTruncated: true }),
      )
      return
    }
    sessionStorage.setItem(STORAGE_PREFIX + session.appId, JSON.stringify(session))
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
 * <p>
 * 整页刷新后原请求已经断了，因此把仍在 running 的会话标记为 stopped（保留已生成内容），
 * 页面据此展示"生成已中断"而不是一直转圈。
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
    if (parsed.status === 'running') {
      // 整页刷新：原来的连接已经不存在了，不能继续显示"生成中"
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

export const useGenerationStore = defineStore('generation', () => {
  /** appId -> 会话 */
  const sessions = ref<Record<string, GenerationSession>>({})
  /** 当前活动的生成请求控制器：appId -> AbortController */
  const controllers = new Map<string, AbortController>()

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
   * 启动生成：已存在运行中的会话时直接复用，不会重复发起请求
   *
   * @param appId  应用 id
   * @param prompt 提示词
   */
  const startGeneration = (appId: string, prompt: string) => {
    if (isGenerating(appId)) {
      return
    }
    const controller = new AbortController()
    controllers.set(appId, controller)
    sessions.value[appId] = createSession(appId)
    const session = sessions.value[appId]
    // 立刻落一份：用户可能刚发出消息就刷新页面，也要能恢复出"这条生成存在"
    persistSession(session)

    const patch = (updater: (target: GenerationSession) => void) => {
      const target = sessions.value[appId]
      if (!target) {
        return
      }
      updater(target)
      // 每次变化都落一份到 sessionStorage：整页刷新/浏览器返回后仍能恢复
      persistSession(target)
    }

    void streamSse<string>({
      url: '/app/chat/gen/code',
      params: { appId, prompt },
      abortController: controller,
      onMessage: (event) => {
        // 后端保证任何情况下都以 event:done 结束
        if (event.event === 'done') {
          patch((target) => {
            target.doneReceived = true
          })
          return
        }
        const streamMessage = parseStreamMessage(event.data)
        if (streamMessage) {
          handleStreamMessage(streamMessage, patch)
          return
        }
        // HTML / 多文件模式是纯文本增量（兼容 {d: '...'} 包装）
        const payload = event.data as unknown
        const chunk =
          typeof payload === 'string'
            ? payload
            : payload && typeof (payload as { d?: unknown }).d === 'string'
              ? (payload as { d: string }).d
              : ''
        if (chunk) {
          patch((target) => {
            target.content += chunk
          })
        }
      },
      onError: (error) => {
        patch((target) => {
          target.status = 'error'
          target.errorMessage = (error as Error)?.message || '生成失败，请重试'
          target.finishedAt = Date.now()
        })
      },
      onClose: () => {
        const aborted = controller.signal.aborted
        patch((target) => {
          if (target.status === 'running') {
            if (target.doneReceived) {
              target.status = 'done'
            } else if (aborted) {
              // 主动中断（切换应用/用户停止）：保留已生成内容，标记为已停止
              target.status = 'stopped'
            } else {
              // 没等到 done 连接就关闭：按失败处理，避免把半成品当成功
              target.status = 'error'
              target.errorMessage = '生成连接已中断，请重试'
            }
          }
          target.finishedAt = Date.now()
        })
        controllers.delete(appId)
      },
    })
  }

  /** 处理一条 VUE_PROJECT 的 JSON 消息 */
  const handleStreamMessage = (
    message: ParsedStreamMessage,
    patch: (updater: (target: GenerationSession) => void) => void,
  ) => {
    if (message.type === STREAM_MESSAGE_TYPE.AI_RESPONSE) {
      if (message.data) {
        patch((target) => {
          target.content += message.data
        })
      }
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_REQUEST) {
      patch((target) => {
        target.content += '\n\n> [🔧 选择工具] 写入文件\n\n'
      })
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.TOOL_EXECUTED) {
      const file = parseToolArguments(message.arguments)
      if (!file) {
        return
      }
      const suffix = file.relativePath.split('.').pop() ?? ''
      const fence = suffix && suffix !== file.relativePath ? suffix : 'text'
      patch((target) => {
        target.toolExecutions.push(file)
        target.content += `\n\n[🔧 工具调用] 写入文件 ${file.relativePath}\n\n\`\`\`${fence}\n${file.content}\n\`\`\`\n\n`
      })
      return
    }
    if (message.type === STREAM_MESSAGE_TYPE.ERROR) {
      patch((target) => {
        target.status = 'error'
        target.errorMessage = message.data || '生成失败，请重试'
      })
    }
  }

  /**
   * 中断某个应用的生成（切换应用时用；用户主动"停止生成"也走这里）
   *
   * @param appId 应用 id
   */
  const abortGeneration = (appId: string) => {
    const controller = controllers.get(appId)
    if (controller) {
      controller.abort()
      controllers.delete(appId)
    }
    const session = sessions.value[appId]
    if (session && session.status === 'running') {
      session.status = 'stopped'
      session.finishedAt = Date.now()
      persistSession(session)
    }
  }

  /** 清空某个应用的会话（例如重新初始化页面时） */
  const clearSession = (appId: string) => {
    abortGeneration(appId)
    delete sessions.value[appId]
    removePersistedSession(appId)
  }

  return {
    sessions,
    hasRunningSession,
    isGenerating,
    getSession,
    startGeneration,
    abortGeneration,
    clearSession,
  }
})
