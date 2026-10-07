// AI 模型类型常量（与后端 AIModelTypeEnum 枚举保持一致）

import { createEnumNameGetter } from '@/utils/enumOptions'

/** AI 模型类型枚举值（与后端 AIModelTypeEnum.value、以及配置里的 model-name 一致） */
export const AI_MODEL_TYPE = {
  /** DeepSeek Flash：速度快 */
  DEEPSEEK_FLASH: 'deepseek-flash',
  /** DeepSeek V4 Pro：推理强 */
  DEEPSEEK_V4_PRO: 'deepseek-v4-pro',
} as const

/** AI 模型类型取值 */
export type AiModelType = (typeof AI_MODEL_TYPE)[keyof typeof AI_MODEL_TYPE]

/** AI 模型类型下拉选项（label 对应后端枚举的 text，value 对应枚举的 value） */
export const AI_MODEL_TYPE_OPTIONS: { label: string; value: AiModelType }[] = [
  { label: 'DeepSeek Flash（速度快）', value: AI_MODEL_TYPE.DEEPSEEK_FLASH },
  { label: 'DeepSeek V4 Pro（推理强）', value: AI_MODEL_TYPE.DEEPSEEK_V4_PRO },
]

/** 获取 AI 模型类型的中文名称，未知类型原样返回，空值返回 - */
export const getAiModelTypeName = createEnumNameGetter(AI_MODEL_TYPE_OPTIONS)
