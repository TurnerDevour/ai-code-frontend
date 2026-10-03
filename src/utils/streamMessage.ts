/**
 * Vue 工程模式（VUE_PROJECT）流式消息解析。
 *
 * 后端 TokenStream 的每个数据块都是一个 JSON 字符串，通过 SSE 的 data 字段下发，
 * 结构为 { type: 'ai_response' | 'tool_request' | 'tool_executed', ... }。
 * 与后端 StreamMessageTypeEnum 保持一致。
 */

/** 消息类型枚举值（与后端 StreamMessageTypeEnum 一致） */
export const STREAM_MESSAGE_TYPE = {
  /** AI 文本响应（含推理模型的思考内容） */
  AI_RESPONSE: 'ai_response',
  /** 工具调用请求 */
  TOOL_REQUEST: 'tool_request',
  /** 工具执行结果，携带写入文件的路径与内容 */
  TOOL_EXECUTED: 'tool_executed',
} as const

export type StreamMessageType = (typeof STREAM_MESSAGE_TYPE)[keyof typeof STREAM_MESSAGE_TYPE]

/** 解析后的流式消息 */
export interface ParsedStreamMessage {
  type: StreamMessageType
  /** ai_response 的文本内容 */
  data: string
  /** tool_* 的工具名称 */
  name: string
  /** tool_executed 的入参 JSON 字符串 */
  arguments: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

/**
 * 判断是否为 VUE_PROJECT 的 JSON 消息
 */
export const isVueProjectStreamMessage = (payload: unknown): boolean => {
  if (!isRecord(payload)) {
    return false
  }
  return Object.values(STREAM_MESSAGE_TYPE).includes(payload.type as StreamMessageType)
}

/**
 * 解析流式消息，非 VUE_PROJECT 消息（如 HTML / 多文件模式的纯文本）返回 null
 */
export const parseStreamMessage = (payload: unknown): ParsedStreamMessage | null => {
  const raw = typeof payload === 'string' ? tryParseJson(payload) : payload
  if (!isVueProjectStreamMessage(raw)) {
    return null
  }
  const record = raw as Record<string, unknown>
  return {
    type: record.type as StreamMessageType,
    data: asString(record.data),
    name: asString(record.name),
    arguments: asString(record.arguments),
  }
}

/**
 * 解析工具入参，取出写入的文件路径与内容
 */
export const parseToolArguments = (
  args: string,
): { relativePath: string; content: string } | null => {
  const parsed = tryParseJson(args)
  if (!isRecord(parsed)) {
    return null
  }
  // 后端 FileWriteTool 的形参名为 relativePath，兼容 relativeFilePath 以增强健壮性
  const relativePath = asString(parsed.relativePath) || asString(parsed.relativeFilePath)
  if (!relativePath) {
    return null
  }
  return { relativePath, content: asString(parsed.content) }
}

const tryParseJson = (text: string): unknown => {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}
