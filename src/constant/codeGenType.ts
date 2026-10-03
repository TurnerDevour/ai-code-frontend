// 代码生成类型常量（与后端 CodeGenTypeEnum 枚举保持一致）

/** 代码生成类型枚举值 */
export const CODE_GEN_TYPE = {
  /** 原生 HTML 模式 */
  HTML: 'html',
  /** 原生多文件模式 */
  MULTI_FILE: 'multi_file',
  /** Vue 模式 */
  VUE_PROJECT: 'vue_project',
} as const

/** 代码生成类型取值 */
export type CodeGenType = (typeof CODE_GEN_TYPE)[keyof typeof CODE_GEN_TYPE]

/** 代码生成类型下拉选项（label 对应后端枚举的 text，value 对应枚举的 value） */
export const CODE_GEN_TYPE_OPTIONS: { label: string; value: CodeGenType }[] = [
  { label: '原生 HTML 模式', value: CODE_GEN_TYPE.HTML },
  { label: '原生多文件模式', value: CODE_GEN_TYPE.MULTI_FILE },
  { label: 'Vue 模式', value: CODE_GEN_TYPE.VUE_PROJECT },
]

/** 代码生成类型名称映射：值 -> 中文名称 */
export const CODE_GEN_TYPE_NAME_MAP = CODE_GEN_TYPE_OPTIONS.reduce<Record<string, string>>(
  (map, option) => {
    map[option.value] = option.label
    return map
  },
  {},
)

/** 获取代码生成类型的中文名称，未知类型原样返回，空值返回 - */
export const getCodeGenTypeName = (codeGenType?: string) => {
  if (!codeGenType) {
    return '-'
  }
  return CODE_GEN_TYPE_NAME_MAP[codeGenType] ?? codeGenType
}
