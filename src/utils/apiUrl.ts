/**
 * 后端接口基础地址（与 utils/request.ts 中的 baseURL 保持一致）
 */
export const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/**
 * 获取应用生成后的静态资源访问地址
 * 本地形如：http://localhost:8123/api/static/multi_file_{appId}/
 * @param codeGenType 代码生成类型
 * @param appId 应用 id
 * @param deployKey 部署标识，部署后可通过该地址访问产物
 */
export const getStaticUrl = (codeGenType?: string, appId?: string, deployKey?: string) => {
  const path = deployKey ? deployKey : `${codeGenType ?? 'multi_file'}_${appId ?? ''}`
  return `${baseUrl}/static/${path}/`
}

/**
 * 获取应用「部署后」的访问地址（与生成产物的浏览地址不同，请勿混用）
 * 后端返回：AppConstant.CODE_DEPLOY_HOST + "/" + deployKey + "/"，即 http://localhost/{deployKey}/
 * @param deployKey 部署标识
 */
export const getDeployUrl = (deployKey: string) => {
  return `http://localhost/${deployKey}/`
}
