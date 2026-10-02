// 应用相关常量

/** 精选应用的优先级 */
export const GOOD_APP_PRIORITY = 99
/** 默认应用的优先级 */
export const DEFAULT_APP_PRIORITY = 0

/** 应用优先级可选项（对应后端 AppConstant 的两个优先级常量） */
export const APP_PRIORITY_OPTIONS = [
  { label: '默认应用', value: DEFAULT_APP_PRIORITY },
  { label: '精选应用', value: GOOD_APP_PRIORITY },
]

/** 主页列表每页数量 */
export const HOME_PAGE_SIZE = 6

/** 应用管理页每页数量 */
export const MANAGE_PAGE_SIZE = 10

/** 新建应用时在首页展示的推荐提示词 */
export const PROMPT_PRESETS = [
  '波普风电商页面',
  '企业网站',
  '电商运营后台',
  '暗黑话题社区',
] as const
