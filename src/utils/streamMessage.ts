/**
 * Vue 工程模式（VUE_PROJECT）流式消息解析。
 *
 * 后端 TokenStream 的每个数据块都是一个 JSON 字符串，通过 SSE 的 data 字段下发，
 * 结构为 { type: 'ai_response' | 'ai_thinking' | 'tool_request' | 'tool_executed' | 'error', ... }。
 * 与后端 StreamMessageTypeEnum 保持一致。
 *
 * 注意：error 同样走 data: 帧（{"type":"error","data":"..."}），与 ai_response 同层，
 * 而不是具名的 event: error 帧 —— 避免与 SSE 的错误/重连语义混淆。
 */

/** 消息类型枚举值（与后端 StreamMessageTypeEnum 一致） */
export const STREAM_MESSAGE_TYPE = {
  /** AI 文本响应（给用户看的正文） */
  AI_RESPONSE: 'ai_response',
  /** AI 思考过程（推理模型的 reasoning_content），展示在对话页顶部的「AI 思考过程」面板 */
  AI_THINKING: 'ai_thinking',
  /** 工具调用请求 */
  TOOL_REQUEST: 'tool_request',
  /** 工具执行结果，携带写入文件的路径与内容 */
  TOOL_EXECUTED: 'tool_executed',
  /** 生成过程中的错误，data 为可直接展示的错误原因 */
  ERROR: 'error',
} as const

export type StreamMessageType = (typeof STREAM_MESSAGE_TYPE)[keyof typeof STREAM_MESSAGE_TYPE]

/** 解析后的流式消息 */
export interface ParsedStreamMessage {
  type: StreamMessageType
  /** ai_response / ai_thinking / error 的文本内容（error 时为错误原因） */
  data: string
  /** tool_* 的工具名称 */
  name: string
  /** tool_executed 的入参 JSON 字符串 */
  arguments: string
  /** tool_executed 是否执行失败（参数不合法 / 工具名不存在 / 工具内部异常） */
  failed: boolean
  /** tool_executed 的工具返回内容（失败时即失败原因） */
  result: string
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
    // 后端 ToolExecutedMessage.failed：LangChain4j 对"参数不合法 / 工具名不存在 / 工具异常"
    // 同样会回调 onToolExecuted，因此必须显式区分，否则界面上"写了文件"与"根本没写"长得一样
    failed: record.failed === true,
    result: asString(record.result),
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
