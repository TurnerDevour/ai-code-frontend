/**
 * 文件下载相关工具
 * 后端下载接口直接向响应流写二进制内容，并通过 HTTP 响应头描述文件信息：
 *   response.setContentType("application/zip");
 *   response.addHeader("Content-Disposition", "attachment; filename=\"xxx.zip\"");
 * 因此前端需要：按 blob 接收响应 -> 解析 Content-Disposition 得到文件名 -> 触发浏览器保存。
 */

/** 疑似错误响应体的最大解析体积（错误信息是 JSON，正常不会超过 64KB） */
const MAX_ERROR_BODY_SIZE = 64 * 1024

/**
 * 规整文件名：去掉可能被注入的路径分隔符，避免保存到用户目录之外
 */
const normalizeFileName = (fileName: string, fallback: string) => {
  const name = fileName.split(/[\\/]/).pop()?.trim() ?? ''
  return name || fallback
}

/**
 * 解析 Content-Disposition 响应头中的文件名
 * 优先取 RFC 5987 的 filename*=UTF-8''xxx（可携带中文），否则回落到 filename="xxx.zip"
 * @param contentDisposition 响应头内容，如 attachment; filename="1.zip"
 * @param fallback 无法解析时使用的兜底文件名
 */
export const parseDownloadFileName = (
  contentDisposition?: string | null,
  fallback = 'download.zip',
) => {
  if (!contentDisposition) {
    return fallback
  }
  // filename*=UTF-8''%E5%BA%94%E7%94%A8.zip
  const encodedMatch = /filename\*=\s*(?:utf-8|UTF-8)''([^;]+)/i.exec(contentDisposition)
  if (encodedMatch?.[1]) {
    try {
      return normalizeFileName(decodeURIComponent(encodedMatch[1].trim()), fallback)
    } catch {
      // 解码失败（编码不合法）时回落到 filename 分支
    }
  }
  const plainMatch = /filename=\s*"?([^";]+)"?/i.exec(contentDisposition)
  if (plainMatch?.[1]) {
    return normalizeFileName(plainMatch[1].trim(), fallback)
  }
  return fallback
}

/**
 * 将 Blob 保存为本地文件（用临时 a 标签触发浏览器下载）
 * @param blob 响应体
 * @param fileName 保存的文件名
 */
export const saveBlobAsFile = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 浏览器是异步读取 blob 的，立即回收会导致部分浏览器下载失败，放到下一轮事件循环释放
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}

/**
 * 解析后端下发的错误提示
 * 下载接口出错时 HTTP 状态码仍为 200，响应体却是 application/json 的 BaseResponse，
 * 这里把 Blob / JSON 字符串 / 普通对象三种形态统一还原成 message；非错误响应返回空字符串
 * @param payload 响应体（axios 的 response.data 或 error.response.data）
 */
export const parseResponseErrorMessage = async (payload: unknown): Promise<string> => {
  if (payload instanceof Blob) {
    // 正常响应是 application/zip 的压缩包，无需解析内容
    const mayBeErrorBody =
      payload.type.includes('json') || (!payload.type && payload.size <= MAX_ERROR_BODY_SIZE)
    return mayBeErrorBody ? parseResponseErrorMessage(await payload.text()) : ''
  }
  if (typeof payload === 'string') {
    const text = payload.trim()
    if (!text.startsWith('{')) {
      return ''
    }
    try {
      return parseResponseErrorMessage(JSON.parse(text))
    } catch {
      return ''
    }
  }
  if (payload && typeof payload === 'object') {
    const { message } = payload as { message?: unknown }
    return typeof message === 'string' ? message : ''
  }
  return ''
}
