// 枚举型常量（代码生成类型 / AI 模型类型 / 消息类型）共用的构造逻辑：
// 常量文件只声明 options，名称映射与取值函数在这里统一生成

/** label 为展示名称，value 为后端枚举值 */
export interface EnumOption {
  label: string
  value: string
}

/**
 * 由下拉选项生成「取值 -> 中文名称」的查询函数；
 * 未知取值原样返回（后端新增枚举时页面不会显示空白），空值统一返回 `-`。
 */
export const createEnumNameGetter = (options: readonly EnumOption[]) => {
  const nameMap = options.reduce<Record<string, string>>((map, option) => {
    map[option.value] = option.label
    return map
  }, {})

  return (value?: string) => {
    if (!value) {
      return '-'
    }
    return nameMap[value] ?? value
  }
}
