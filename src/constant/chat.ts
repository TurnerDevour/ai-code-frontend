// 对话历史相关常量（与后端 ChatMessageTypeEnum、ChatHistoryConstant 保持一致）

import { createEnumNameGetter } from '@/utils/enumOptions'

/** 对话消息类型枚举值（对应后端 ChatMessageTypeEnum） */
export const CHAT_MESSAGE_TYPE = {
  /** 用户消息 */
  USER: 'user',
  /** AI 消息 */
  AI: 'ai',
  /** 错误消息 */
  ERROR: 'error',
} as const

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPE)[keyof typeof CHAT_MESSAGE_TYPE]

/** 对话消息类型下拉选项（label 对应后端枚举 text，value 对应枚举 value） */
export const CHAT_MESSAGE_TYPE_OPTIONS: { label: string; value: ChatMessageType }[] = [
  { label: '用户消息', value: CHAT_MESSAGE_TYPE.USER },
  { label: 'AI 消息', value: CHAT_MESSAGE_TYPE.AI },
  { label: '错误消息', value: CHAT_MESSAGE_TYPE.ERROR },
]

/** 获取对话消息类型的中文名称，未知类型原样返回，空值返回 - */
export const getChatMessageTypeName = createEnumNameGetter(CHAT_MESSAGE_TYPE_OPTIONS)

/** 对话历史每次加载的条数（对应后端 ChatHistoryConstant.DEFAULT_PAGE_SIZE） */
export const CHAT_HISTORY_PAGE_SIZE = 10

/** 展示应用网站所需的最少对话记录数（一条用户消息 + 一条 AI 消息） */
export const MIN_CHAT_HISTORY_FOR_PREVIEW = 2

/** 提示词输入框最大字符数（首页与对话页共用同一来源做计数与校验） */
export const CHAT_INPUT_MAX_LENGTH = 2000
