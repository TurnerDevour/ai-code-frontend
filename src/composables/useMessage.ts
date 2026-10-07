/**
 * 全局消息提示的收敛层。
 *
 * 背景：项目里各页面反复出现同一段样板：
 *   message.error('获取数据失败，' + res.data.message).then(() => {})
 * 其中 `.then(() => {})` 是为了吞掉 antd 返回的 Promise（否则控制台会出现 unhandled rejection），
 * 「前缀 + 后端 message」的拼接格式也在十几处被手写复制。
 * 这里统一成一组短调用，页面只关心业务本身。
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

/** 成功提示 */
export const showSuccess = (content: string) => {
  message.success(content).then(() => {})
}

/** 失败提示 */
export const showError = (content: string) => {
  message.error(content).then(() => {})
}

/** 警告提示 */
export const showWarning = (content: string) => {
  message.warning(content).then(() => {})
}

/** 普通提示 */
export const showInfo = (content: string, duration?: number) => {
  message.info(content, duration).then(() => {})
}

/**
 * 按「业务前缀 + 后端 message」的固定格式提示失败
 * <p>
 * 后端 message 为空时只展示前缀，不会留下一个孤零零的逗号。
 *
 * @param prefix   业务前缀，如「获取数据失败」
 * @param response 后端响应体
 */
export const showResponseError = (prefix: string, response?: ResponseBody | null) => {
  const detail = response?.message?.trim()
  showError(detail ? `${prefix}，${detail}` : prefix)
}

/**
 * 统一处理写操作（新增 / 修改 / 删除）的响应
 *
 * @param response 接口返回值
 * @param tips     success 为成功文案（不传则不提示成功），fail 为失败前缀
 *
 * @returns 是否成功，调用方可据此继续做刷新 / 跳转
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
 * <p>
 * 与上面的具名导出是同一批实现，只提供更贴近页面书写习惯的调用形式。
 */
export const useMessage = () => ({
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  /** 失败提示（前缀 + 后端 message） */
  fail: showResponseError,
  /** 写操作响应处理 */
  handle: handleResponse,
})
