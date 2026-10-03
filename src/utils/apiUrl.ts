import { CODE_GEN_TYPE } from '@/constant/codeGenType'

/** 去掉末尾多余的 /，避免拼接出双斜杠 */
const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, '')

/**
 * 后端接口基础地址（与 utils/request.ts 中的 baseURL 保持一致）
 * 来自环境变量 VITE_API_BASE_URL，如 http://localhost:8123/api
 */
export const baseUrl = trimTrailingSlashes(import.meta.env.VITE_API_BASE_URL ?? '')

/**
 * 应用生成产物的预览地址前缀，来自环境变量 VITE_APP_PREVIEW_BASE_URL
 * 本地形如：http://localhost:8123/api/static
 * 未配置时退回「接口地址 + /static」，与旧行为保持一致
 */
export const previewBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_APP_PREVIEW_BASE_URL ?? `${baseUrl}/static`,
)

/**
 * 应用部署后的访问地址前缀，来自环境变量 VITE_APP_DEPLOY_BASE_URL
 * 对应后端 AppConstant.CODE_DEPLOY_HOST，本地形如：http://localhost
 * 未配置时退回 http://localhost，与旧行为保持一致
 */
export const deployBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_APP_DEPLOY_BASE_URL ?? 'http://localhost',
)

/**
 * 获取应用生成后的静态资源访问地址（预览域名 + 产物目录）
 * 本地形如：http://localhost:8123/api/static/multi_file_{appId}/
 * @param codeGenType 代码生成类型
 * @param appId 应用 id
 * @param deployKey 部署标识，部署后可通过该地址访问产物
 */
export const getStaticUrl = (codeGenType?: string, appId?: string, deployKey?: string) => {
  // Vue 工程模式的产物目录是 {codeGenType}_{appId}（与后端 CodeFileSaverTemplate 一致），
  // 构建输出在其 dist 子目录中，因此必须带上应用目录，否则会请求到不存在的 /static/dist/index.html
  if (codeGenType === CODE_GEN_TYPE.VUE_PROJECT) {
    return `${previewBaseUrl}/vue_project_${appId ?? ''}/dist/index.html`
  }
  const path = deployKey ? deployKey : `${codeGenType ?? 'multi_file'}_${appId ?? ''}`
  return `${previewBaseUrl}/${path}/`
}

/**
 * 获取应用「部署后」的访问地址（与生成产物的预览地址不同，请勿混用）
 * 对应后端返回：AppConstant.CODE_DEPLOY_HOST + "/" + deployKey + "/"
 * 本地形如：http://localhost/{deployKey}/
 * @param deployKey 部署标识
 */
export const getDeployUrl = (deployKey: string) => {
  return `${deployBaseUrl}/${deployKey}/`
}
