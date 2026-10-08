/**
 * Markdown 渲染节流。
 *
 * 流式输出的分片很密，而 Markdown 解析 + 代码高亮都有成本，因此按固定间隔重渲染，
 * 流结束时再立即渲染一次，兼顾实时展示与流畅度。
 */
import { onScopeDispose } from 'vue'

/** 默认节流间隔（毫秒） */
export const MARKDOWN_RENDER_INTERVAL = 100

/** 可被节流渲染的消息 */
export interface MarkdownRenderTarget {
  id: string
  content: string
  html: string
}

export const useMarkdownThrottle = (
  render: (content: string) => string,
  interval: number = MARKDOWN_RENDER_INTERVAL,
) => {
  /** 消息 id -> 待触发的定时器 */
  const timers = new Map<string, number>()

  /** 取消某条消息尚未触发的定时器 */
  const cancel = (id: string) => {
    const timer = timers.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.delete(id)
    }
  }

  /** 流结束、报错时立即渲染 */
  const flush = (target: MarkdownRenderTarget) => {
    cancel(target.id)
    target.html = render(target.content)
  }

  /** 流式追加内容时按 interval 节流渲染 */
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

  // 卸载兜底清理，避免定时器泄漏
  onScopeDispose(clear)

  return { flush, schedule, clear }
}
