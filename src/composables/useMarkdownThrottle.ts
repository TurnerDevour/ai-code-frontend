/**
 * Markdown 渲染节流。
 *
 * 流式输出的分片很密，而 Markdown 解析 + 代码高亮都有成本，
 * 因此按固定间隔重渲染，流结束时再立即渲染一次，兼顾实时展示与流畅度。
 * 这段逻辑原先直接写在对话页里（定时器 Map + 三个函数 + 一处清理），
 * 抽成 hook 后页面只关心「什么时候要渲染」。
 */
import { onScopeDispose } from 'vue'

/** 默认节流间隔（毫秒） */
export const MARKDOWN_RENDER_INTERVAL = 100

/** 可被节流渲染的消息：至少要有 id / 原文 / 渲染结果 */
export interface MarkdownRenderTarget {
  id: string
  content: string
  html: string
}

/**
 * @param render  纯渲染函数：把 Markdown 原文转成 HTML
 * @param interval 节流间隔（毫秒）
 */
export const useMarkdownThrottle = (
  render: (content: string) => string,
  interval: number = MARKDOWN_RENDER_INTERVAL,
) => {
  /** 消息 id -> 待触发的定时器 */
  const timers = new Map<string, number>()

  /** 清掉某条消息尚未触发的定时器 */
  const cancel = (id: string) => {
    const timer = timers.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.delete(id)
    }
  }

  /** 立即渲染（流结束、报错时调用） */
  const flush = (target: MarkdownRenderTarget) => {
    cancel(target.id)
    target.html = render(target.content)
  }

  /** 节流渲染（流式追加内容时调用） */
  const schedule = (target: MarkdownRenderTarget) => {
    if (timers.has(target.id)) {
      return
    }
    const timer = window.setTimeout(() => {
      timers.delete(target.id)
      target.html = render(target.content)
    }, interval)
    timers.set(target.id, timer)
  }

  /** 清掉全部未触发的定时器（切换目标、离开页面时调用） */
  const clear = () => {
    timers.forEach((timer) => window.clearTimeout(timer))
    timers.clear()
  }

  // 组件卸载兜底清理，避免定时器泄漏
  onScopeDispose(clear)

  return { flush, schedule, clear }
}
