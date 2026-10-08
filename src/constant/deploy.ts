// 应用部署状态常量（与后端 DeployStatusEnum 保持一致）

/** 部署状态枚举值（对应后端 DeployStatusEnum） */
export const DEPLOY_STATUS = {
  /** 未部署（老数据没有部署记录时后端也返回该值） */
  IDLE: 'idle',
  /** 已受理，正在排队等待构建 */
  QUEUED: 'queued',
  /** 正在构建（npm install + build） */
  DEPLOYING: 'deploying',
  /** 部署完成，可通过 deployUrl 访问 */
  READY: 'ready',
  /** 部署失败，失败原因见 errorMessage */
  FAILED: 'failed',
} as const

export type DeployStatus = (typeof DEPLOY_STATUS)[keyof typeof DEPLOY_STATUS]

/** 状态标签展示配置 */
export interface DeployStatusMeta {
  /** 状态文案（不含「第 N 位」这类动态信息） */
  label: string
  /** a-tag 的颜色 */
  color: 'default' | 'processing' | 'success' | 'error'
}

/** 部署状态的文案与颜色 */
export const DEPLOY_STATUS_META: Record<DeployStatus, DeployStatusMeta> = {
  [DEPLOY_STATUS.IDLE]: { label: '未部署', color: 'default' },
  [DEPLOY_STATUS.QUEUED]: { label: '排队中', color: 'processing' },
  [DEPLOY_STATUS.DEPLOYING]: { label: '部署中', color: 'processing' },
  [DEPLOY_STATUS.READY]: { label: '已部署', color: 'success' },
  [DEPLOY_STATUS.FAILED]: { label: '部署失败', color: 'error' },
}

/** 获取部署状态的展示配置：未知状态（含后端新增状态）按「未部署」兜底 */
export const getDeployStatusMeta = (status?: string | null): DeployStatusMeta => {
  return DEPLOY_STATUS_META[status as DeployStatus] ?? DEPLOY_STATUS_META[DEPLOY_STATUS.IDLE]
}

/** 是否为「进行中」状态：排队中与构建中都需要继续轮询（后端唯一新增的状态值就是 queued） */
export const isDeployInProgress = (status?: string | null) =>
  status === DEPLOY_STATUS.QUEUED || status === DEPLOY_STATUS.DEPLOYING

/** 是否为终态：已部署 / 部署失败，轮询到此即可结束 */
export const isDeployFinished = (status?: string | null) =>
  status === DEPLOY_STATUS.READY || status === DEPLOY_STATUS.FAILED
