/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端接口基础地址，如 http://localhost:8123/api */
  readonly VITE_API_BASE_URL?: string
  /** 应用生成产物的预览域名（可带路径前缀），如 http://localhost:8123/api/static */
  readonly VITE_APP_PREVIEW_BASE_URL?: string
  /** 应用部署后的访问域名，对应后端 AppConstant.CODE_DEPLOY_HOST，如 http://localhost */
  readonly VITE_APP_DEPLOY_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
