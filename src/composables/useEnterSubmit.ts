/**
 * 提示词输入框的「回车提交、Shift + 回车换行」行为（首页 PromptInput 与对话页输入框共用）。
 * 规则：Shift + 回车 -> 换行；输入法组合期间（中文候选词）的回车 -> 确认候选词，不提交；其余回车 -> 提交。
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
