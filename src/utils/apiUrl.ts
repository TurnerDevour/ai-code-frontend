import { CODE_GEN_TYPE } from '@/constant/codeGenType'

/** 去掉末尾 /，避免拼接出双斜杠 */
const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, '')

/** 接口基础地址，来自 VITE_API_BASE_URL（与 utils/request.ts 的 baseURL 一致），如 http://localhost:8123/api */
export const baseUrl = trimTrailingSlashes(import.meta.env.VITE_API_BASE_URL ?? '')

/** 生成产物的预览地址前缀，来自 VITE_APP_PREVIEW_BASE_URL，如 http://localhost:8123/api/static；
 * 未配置时退回 `${baseUrl}/static` */
export const previewBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_APP_PREVIEW_BASE_URL ?? `${baseUrl}/static`,
)

/** 部署后的访问地址前缀，来自 VITE_APP_DEPLOY_BASE_URL，对应后端 AppConstant.CODE_DEPLOY_HOST；
 * 未配置时退回 http://localhost */
export const deployBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_APP_DEPLOY_BASE_URL ?? 'http://localhost',
)

/**
 * 生成后的静态资源访问地址（预览域名 + 产物目录），如 http://localhost:8123/api/static/multi_file_{appId}/
 * 传入 deployKey 时以它作为产物目录，即部署后可访问的地址
 */
export const getStaticUrl = (codeGenType?: string, appId?: string, deployKey?: string) => {
  // Vue 工程产物在 {codeGenType}_{appId}/dist 下（与后端 CodeFileSaverTemplate 一致），
  // 不带应用目录会请求到不存在的 /static/dist/index.html
  if (codeGenType === CODE_GEN_TYPE.VUE_PROJECT) {
    return `${previewBaseUrl}/vue_project_${appId ?? ''}/dist/index.html`
  }
  const path = deployKey ? deployKey : `${codeGenType ?? 'multi_file'}_${appId ?? ''}`
  return `${previewBaseUrl}/${path}/`
}

/** 部署后的访问地址（deployBaseUrl + deployKey），如 http://localhost/{deployKey}/，勿与预览地址混用 */
export const getDeployUrl = (deployKey: string) => {
  return `${deployBaseUrl}/${deployKey}/`
}
