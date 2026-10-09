// AI 模型类型常量（与后端 AIModelTypeEnum 枚举保持一致）
// 目前四个模型全部部署在阿里云百炼：DeepSeek 系列与 Qwen 系列走同一个业务空间（workspace）

import { createEnumNameGetter } from '@/utils/enumOptions'

/** AI 模型类型枚举值（与后端 AIModelTypeEnum.value、以及配置里的 model-name 一致） */
export const AI_MODEL_TYPE = {
  /** DeepSeek V4.1-Flash：阿里云百炼（DeepSeek 系列），速度快 */
  DEEPSEEK_V4_1_FLASH: 'deepseek-v4.1-flash',
  /** DeepSeek V4 Pro：阿里云百炼（DeepSeek 系列），推理强 */
  DEEPSEEK_V4_PRO: 'deepseek-v4-pro',
  /** Qwen3.8-Max：阿里云百炼旗舰，100 万上下文、默认思考模式 */
  QWEN_3_8_MAX: 'qwen3.8-max',
  /** Qwen3.8-Flash：阿里云百炼高性价比，同样支持思考模式与工具调用 */
  QWEN_3_8_FLASH: 'qwen3.8-flash',
} as const

/** AI 模型类型取值 */
export type AiModelType = (typeof AI_MODEL_TYPE)[keyof typeof AI_MODEL_TYPE]

/**
 * AI 模型下拉选项（label 对应后端枚举 text，value 对应枚举 value）
 *
 * 新增模型必须与后端 AIModelTypeEnum 同步：`value` 既是数据库 `app.ai_model_type` 的取值，
 * 也是后端 `ai.models.<value>` 的配置 key；后端没配该模型的机器上选中它，生成时会报「AI 模型不可用」。
 */
export const AI_MODEL_TYPE_OPTIONS: { label: string; value: AiModelType }[] = [
  { label: 'DeepSeek V4.1-Flash（阿里云百炼-速度快）', value: AI_MODEL_TYPE.DEEPSEEK_V4_1_FLASH },
  { label: 'DeepSeek V4 Pro（阿里云百炼-推理强）', value: AI_MODEL_TYPE.DEEPSEEK_V4_PRO },
  { label: 'Qwen3.8-Max（阿里云百炼-旗舰）', value: AI_MODEL_TYPE.QWEN_3_8_MAX },
  { label: 'Qwen3.8-Flash（阿里云百炼-高性价比）', value: AI_MODEL_TYPE.QWEN_3_8_FLASH },
]

/** 获取 AI 模型类型的中文名称，未知类型原样返回，空值返回 - */
export const getAiModelTypeName = createEnumNameGetter(AI_MODEL_TYPE_OPTIONS)
