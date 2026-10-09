/**
 * 流式消息解析：后端每种生成模式（VUE_PROJECT / HTML / MULTI_FILE）的每个数据块都是 JSON 字符串，
 * 通过 SSE 的 data 字段下发，结构为 { type: 'ai_response' | 'ai_thinking' | 'tool_request'
 * | 'tool_executed' | 'error', ... }，与后端 StreamMessageTypeEnum 一致。
 * error 同样走 data: 帧（{"type":"error","data":"..."}），不用具名 event: error 帧，以免与 SSE 的错误/重连语义混淆。
 */

export const STREAM_MESSAGE_TYPE = {
  AI_RESPONSE: 'ai_response',
  /** 推理模型的 reasoning_content，展示在对话页顶部的「AI 思考过程」面板 */
  AI_THINKING: 'ai_thinking',
  TOOL_REQUEST: 'tool_request',
  /** 工具执行结果，携带写入文件的路径与内容 */
  TOOL_EXECUTED: 'tool_executed',
  /** 生成过程中的错误，data 为可直接展示的错误原因 */
  ERROR: 'error',
} as const

export type StreamMessageType = (typeof STREAM_MESSAGE_TYPE)[keyof typeof STREAM_MESSAGE_TYPE]

export interface ParsedStreamMessage {
  type: StreamMessageType
  /** ai_response / ai_thinking / error 的文本内容（error 时为错误原因） */
  data: string
  name: string
  /** tool_executed 的入参 JSON 字符串 */
  arguments: string
  /** tool_executed 是否执行失败（参数不合法 / 工具名不存在 / 工具内部异常） */
  failed: boolean
  /** tool_executed 的工具返回内容（失败时即失败原因） */
  result: string
  /** tool_request / tool_executed 的展示文本（Markdown），后端按各工具声明生成。
   *  必须优先用它：不同工具参数结构不同（writeToFile 是 content，modifyFile 是 oldContent/newContent），
   *  前端按工具名猜结构会把 modifyFile 渲染成"写入文件 + 空代码块"（实测）。 */
  display: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

/** 是否为后端的 JSON 消息（type 命中枚举） */
export const isVueProjectStreamMessage = (payload: unknown): boolean => {
  if (!isRecord(payload)) {
    return false
  }
  return Object.values(STREAM_MESSAGE_TYPE).includes(payload.type as StreamMessageType)
}

/** 解析流式消息；不是 JSON 消息（旧版后端的纯文本增量）时返回 null */
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
    // LangChain4j 对"参数不合法 / 工具名不存在 / 工具异常"同样回调 onToolExecuted，
    // 不显式区分的话界面上"写了文件"与"根本没写"长得一样
    failed: record.failed === true,
    result: asString(record.result),
    // 后端展示文本：有就直接渲染，没有才走前端兜底格式
    display: asString(record.display),
  }
}

/** 解析工具入参，取出写入的文件路径与内容 */
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
