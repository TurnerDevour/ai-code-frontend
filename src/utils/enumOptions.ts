// 枚举型常量（代码生成类型 / AI 模型类型 / 消息类型）的公共构造逻辑。
//
// 三处常量文件此前各自重复了同一段「options -> 名称映射 -> 取值函数」的样板代码，
// 这里收敛成一次实现，常量文件只负责声明 options。

/** 下拉选项的最小结构：label 为展示名称，value 为后端枚举值 */
export interface EnumOption {
  label: string
  value: string
}

/**
 * 由枚举的下拉选项生成「取值 -> 中文名称」的查询函数
 * <p>
 * 未知取值原样返回（后端新增枚举时页面不会显示空白），空值统一返回 `-`。
 *
 * @param options 枚举下拉选项（与后端枚举的 text / value 对应）
 *
 * @returns 名称查询函数
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
