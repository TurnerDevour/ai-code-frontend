import { baseUrl } from '@/utils/apiUrl'

/** SSE 事件数据，data 为 JSON 时会自动反序列化 */
export interface SseMessage<T = string> {
  id?: string
  /** 事件类型，默认为 message */
  event?: string
  data: T
}

interface SseOptions<T> {
  /** 请求地址，会自动拼接 baseUrl */
  url: string
  params?: Record<string, string | number | undefined>
  method?: 'GET' | 'POST'
  /** 请求体，使用 JSON 序列化 */
  body?: unknown
  onMessage: (message: SseMessage<T>) => void
  /** 流结束（正常结束或手动中断）时回调 */
  onClose?: () => void
  onError?: (error: unknown) => void
  /** 外部中断控制器，组件卸载时用来取消请求 */
  abortController?: AbortController
}

const buildUrl = (url: string, params?: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  const queryString = query.toString()
  const path = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`
}

interface RawSseMessage {
  id?: string
  event?: string
  /** 原始的 data 文本，可能包含多行 */
  data: string
}

/** 解析单个 SSE 数据块，兼容 id / event / data 字段（规范：https://html.spec.whatwg.org/multipage/server-sent-events.html） */
const parseChunk = (chunk: string): RawSseMessage | null => {
  const message: RawSseMessage = { data: '' }
  const dataLines: string[] = []
  chunk.split('\n').forEach((line) => {
    if (!line || line.startsWith(':')) {
      return
    }
    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    // 规范中冒号后的首个空格需要被忽略
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue
    if (field === 'data') {
      dataLines.push(value)
    } else if (field === 'event') {
      message.event = value
    } else if (field === 'id') {
      message.id = value
    }
  })
  if (!dataLines.length) {
    return null
  }
  message.data = dataLines.join('\n')
  return message
}

/** 事件数据为 JSON 字符串时自动反序列化，解析失败则原样返回 */
const parseData = (data: string): unknown => {
  const trimmed = data.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return data
    }
  }
  return data
}

/** 用 fetch + ReadableStream 消费后端 SSE：后端返回 text/event-stream，
 *  而浏览器原生 EventSource 不支持自定义请求头与请求方式，所以这里手动解析事件流 */
export const streamSse = async <T = string>(options: SseOptions<T>): Promise<void> => {
  const {
    url,
    params,
    method = 'GET',
    body,
    onMessage,
    onClose,
    onError,
    abortController,
  } = options
  try {
    const response = await fetch(buildUrl(url, params), {
      method,
      credentials: 'include',
      headers: body
        ? {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          }
        : { Accept: 'text/event-stream' },
      body: body ? JSON.stringify(body) : undefined,
      signal: abortController?.signal,
    })
    if (!response.ok || !response.body) {
      throw new Error(`请求失败，状态码：${response.status}`)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    const handleChunk = (chunk: string) => {
      const message = parseChunk(chunk)
      if (!message) {
        return
      }
      onMessage({
        id: message.id,
        event: message.event,
        data: parseData(message.data) as T,
      })
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      // 事件之间以空行分隔，同时兼容 \r\n
      const chunks = buffer.split(/\r?\n\r?\n/)
      buffer = chunks.pop() ?? ''
      chunks.forEach(handleChunk)
    }
    buffer += decoder.decode()
    if (buffer.trim()) {
      handleChunk(buffer)
    }
  } catch (error) {
    // 主动中断不视为异常
    if ((error as Error)?.name === 'AbortError') {
      return
    }
    onError?.(error)
  } finally {
    onClose?.()
  }
}
