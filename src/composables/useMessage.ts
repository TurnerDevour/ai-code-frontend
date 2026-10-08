/**
 * 全局消息提示的收敛层。
 *
 * `.then(() => {})` 是用来吞掉 antd 返回的 Promise（否则控制台会出现 unhandled rejection），
 * 「前缀 + 后端 message」的拼接格式原本在十几处被手写复制，这里统一成一组短调用。
 */
import { message } from 'ant-design-vue'

/** 后端统一响应体（BaseResponse）的最小结构 */
export interface ResponseBody {
  code?: number
  message?: string
  data?: unknown
}

/** 带 BaseResponse 的 axios 响应 */
export interface ResponseLike {
  data?: ResponseBody
}

export const showSuccess = (content: string) => {
  message.success(content).then(() => {})
}

export const showError = (content: string) => {
  message.error(content).then(() => {})
}

export const showWarning = (content: string) => {
  message.warning(content).then(() => {})
}

export const showInfo = (content: string, duration?: number) => {
  message.info(content, duration).then(() => {})
}

/**
 * 按「业务前缀 + 后端 message」的固定格式提示失败；
 * 后端 message 为空时只展示前缀，不会留下一个孤零零的逗号。
 */
export const showResponseError = (prefix: string, response?: ResponseBody | null) => {
  const detail = response?.message?.trim()
  showError(detail ? `${prefix}，${detail}` : prefix)
}

/**
 * 统一处理写操作（新增 / 修改 / 删除）的响应。
 * 返回是否成功，调用方可据此继续刷新 / 跳转；`tips.success` 不传则不提示成功。
 */
export const handleResponse = (
  response: ResponseLike | null | undefined,
  tips: { success?: string; fail: string },
) => {
  if (response?.data?.code === 0) {
    if (tips.success) {
      showSuccess(tips.success)
    }
    return true
  }
  showResponseError(tips.fail, response?.data)
  return false
}

/**
 * 消息提示的组合式入口：`const { success, fail } = useMessage()`
 * 与上面的具名导出是同一批实现，只是更贴近页面书写习惯。
 */
export const useMessage = () => ({
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  fail: showResponseError,
  /** 写操作响应处理 */
  handle: handleResponse,
})
