/**
 * 提示词输入框的「回车提交、Shift + 回车换行」行为。
 *
 * 首页的 PromptInput 与对话页的输入框各写了一份完全相同的实现，
 * 规则有三条且容易漏掉最后一条：
 *   1. Shift + 回车 -> 换行（交回输入框默认行为）
 *   2. 输入法组合期间（中文候选词）的回车 -> 用于确认候选词，不提交
 *   3. 其余回车 -> 阻止默认换行并提交
 *
 * @param submit 提交回调
 */
export const useEnterSubmit = (submit: () => void) => {
  const handlePressEnter = (event: KeyboardEvent) => {
    if (event.shiftKey || event.isComposing) {
      return
    }
    event.preventDefault()
    submit()
  }

  return { handlePressEnter }
}
