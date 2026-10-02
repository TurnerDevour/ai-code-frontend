# AI 应用生成平台 · 前端（ai-code-frontend）

基于 **Vue 3 + Vite + TypeScript + Ant Design Vue** 的 AI 零代码应用生成平台前端：用户用一句话描述需求，AI 流式生成 HTML / 多文件网站代码，并在右侧实时预览、一键部署。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Vue 3（`<script setup>` + Composition API）、Vue Router 4、Pinia 3 |
| 构建 | Vite 7、TypeScript 5.8、vue-tsc |
| UI | Ant Design Vue 4、@ant-design/icons-vue |
| 请求 | Axios（统一实例 + 拦截器）、fetch + ReadableStream（SSE） |
| 内容渲染 | markdown-it 15、highlight.js 11（按需注册语言 + github 主题） |
| 规范 | Prettier 3 |
| 接口类型 | @umijs/openapi（openapi2ts）由后端 OpenAPI 文档生成 |

## 环境要求

- Node.js **≥ 20.19**（或 ≥ 22.12，Vite 7 的最低要求）
- 包管理器：**npm**（仓库内为 `package-lock.json`）
- 后端服务默认运行在 `http://localhost:8123`

## 快速开始

```sh
npm install     # 安装依赖
npm run dev     # 启动开发服务，默认 http://localhost:5173
npm run build   # 类型检查 + 生产构建，产物在 dist/
npm run preview # 本地预览构建产物
```

## 环境变量

变量只在**构建/启动时**注入（修改后需重启 dev server 或重新构建）。

| 文件 | 变量 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | `http://localhost:8123/api` | 后端接口前缀，Axios `baseURL` |
| `.env.development` | `VITE_APP_PREVIEW_BASE_URL` | `http://localhost:8123/api/static` | 生成产物的**预览域名**（可带路径前缀） |
| `.env.development` | `VITE_APP_DEPLOY_BASE_URL` | `http://localhost` | 应用**部署后的访问域名** |
| `.env.production` | `VITE_API_BASE_URL` | `http://wlbc.top/api` | 生产环境接口前缀 |
| `.env.production` | `VITE_APP_PREVIEW_BASE_URL` | `http://wlbc.top/api/static` | 生产环境预览域名 |
| `.env.production` | `VITE_APP_DEPLOY_BASE_URL` | `http://wlbc.top` | 生产环境部署域名（需与后端 `AppConstant.CODE_DEPLOY_HOST` 一致） |

约定：两个域名都**不要以 `/` 结尾**（代码里也会兜底去掉多余斜杠）。所有变量在 [env.d.ts](env.d.ts) 中有类型声明。

## 页面与路由

| 页面 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| 主页 | `/` | 公开 | Hero 提示词输入框（含推荐提示词）、我的应用分页列表、精选案例分页列表，卡片可直接进入对话页 |
| 应用生成对话页 | `/app/chat/:id` | 登录用户 | 左侧对话区（AI 回复 Markdown 渲染 + 代码高亮）、右侧网页展示区，左:右 = 2:3；支持改名、刷新预览、新窗口打开、部署 |
| 应用信息修改页 | `/app/edit/:id` | 登录用户（仅本人） | 普通用户仅可改名 |
| 应用信息修改页（管理员） | `/admin/appEdit/:id` | 管理员 | 可改名称、封面、优先级（下拉选择） |
| 应用管理页 | `/admin/appManage` | 管理员 | 应用列表分页 / 搜索，支持编辑、删除、设为精选 / 取消精选 |
| 用户管理页 | `/admin/userManage` | 管理员 | 用户列表分页 / 搜索、删除 |
| 登录 / 注册 | `/user/login`、`/user/register` | 公开 | 登录成功写入 Pinia 登录态 |
| 个人中心 | `/user/profile` | 登录用户 | 修改昵称、头像、简介 |

路由表见 [src/router/index.ts](src/router/index.ts)：`meta.requiresAuth` 控制登录校验、`meta.role` 控制管理员权限、`meta.showNav` 决定是否出现在顶部导航、`meta.hideHeader / hideFooter` 让对话页等铺满整屏。

## 目录结构

```
src/
├─ api/                 # 接口层（openapi2ts 生成 + 手写封装：appController / userController / typings.d.ts）
├─ assets/              # 静态资源（logo 等）
├─ components/          # 公共组件
│  ├─ AppCard.vue          应用卡片（封面、作者、查看对话 / 查看作品）
│  ├─ AppDetailModal.vue   应用详情弹窗（封面、类型、优先级、创建者、修改 / 删除）
│  ├─ AppModal.vue         弹窗外壳（统一标题、底部按钮与皮肤，内容 teleport 到 body）
│  ├─ AppPriorityTag.vue   优先级标签（精选 / 默认应用 / 自定义，compact 紧凑模式）
│  ├─ CodeGenTypeTag.vue   代码生成类型标签
│  ├─ PageHeader.vue       页面头部（英文小标题 + 标题 + 说明 + 渐变图标）
│  ├─ PromptInput.vue      首页提示词输入框（Enter 发送 / Shift + Enter 换行）
│  └─ GlobalHeader.vue / GlobalFooter.vue
├─ constant/            # 常量：app.ts（优先级、分页大小、推荐提示词）、codeGenType.ts、access.ts
├─ layouts/BasicLayout.vue  应用外壳：固定头尾 + 中间内容区滚动
├─ pages/               # 页面：app/（对话、编辑）、admin/（应用管理、用户管理）、user/（登录、注册、个人中心）
├─ router/index.ts      # 路由表（含权限与导航元信息）
├─ stores/              # Pinia：useLoginUserStore
├─ utils/               # apiUrl（预览 / 部署地址）、markdown（Markdown + 高亮）、request（Axios）、sse、time
├─ App.vue              # 根组件（RouterView）
├─ main.ts              # 应用入口（Pinia、Router、Antd、reset.css）
└─ permission.ts        # 全局路由守卫
```

## 关键实现

- **SSE 流式对话**：后端 `GET /app/chat/gen/code` 返回 `text/event-stream`。浏览器原生 `EventSource` 不支持自定义请求头与 `withCredentials` 场景，因此 [src/utils/sse.ts](src/utils/sse.ts) 用 `fetch` + `ReadableStream` 手动解析事件流：兼容 `id` / `event` / `data` 三种字段、`\r\n` 换行与多行 data，`data` 为 JSON 时自动反序列化，并在组件卸载时通过 `AbortController` 中断请求。每个分片形如 `{"d":"代码片段"}`；收到 `event: done` 时表示代码已全部保存，随后自动展示预览。
- **AI 回复 Markdown 渲染**：[src/utils/markdown.ts](src/utils/markdown.ts) 使用 markdown-it 解析 + highlight.js 高亮（只注册 `xml`(html) / `css` / `javascript`，避免全量语言包），引入 `highlight.js/styles/github.css` 主题；关闭原始 HTML 解析防注入、开启 `linkify` 与 `breaks`、链接统一新窗口打开。流式输出时按 100ms 节流重渲染，流结束时立即渲染一次收敛结果。
- **预览与部署地址**：[src/utils/apiUrl.ts](src/utils/apiUrl.ts) 统一拼接，二者语义不同、不可混用。
  - 生成产物预览：`${VITE_APP_PREVIEW_BASE_URL}/{codeGenType}_{appId}/`，部署后目录名换成 `deployKey`
  - 部署后访问：`${VITE_APP_DEPLOY_BASE_URL}/{deployKey}/`（对应后端 `AppConstant.CODE_DEPLOY_HOST`）
- **布局与滚动**：[src/layouts/BasicLayout.vue](src/layouts/BasicLayout.vue) 是 `height: 100vh; overflow: hidden` 的外壳，**顶部导航和底部版权固定不动，仅中间 `.main-content` 滚动**；带 `meta.hideFooter` 的页面（对话页）切到全屏模式，改为页面内部滚动。
- **登录态与权限**：登录用户信息存于 Pinia（[src/stores/useLoginUserStore.ts](src/stores/useLoginUserStore.ts)）。[src/permission.ts](src/permission.ts) 首次导航时拉取一次当前用户（`/user/get/login`），`requiresAuth` 未登录跳登录页并携带 `redirect`，`meta.role === 'admin'` 非管理员拦回首页。
- **分页与搜索**：列表页统一 `searchParams`（`pageNum` / `pageSize`）+ `pagination`（antd 的 `current` / `pageSize`）模式，表格 `@change` 同步翻页。分页大小集中在 [src/constant/app.ts](src/constant/app.ts)：主页 `HOME_PAGE_SIZE = 6`、管理页 `MANAGE_PAGE_SIZE = 10`。
- **优先级约定**：`GOOD_APP_PRIORITY = 99`（精选，首页「精选案例」来源）、`DEFAULT_APP_PRIORITY = 0`（默认），与后端 `AppConstant` 对齐；其他数值按「自定义」展示。生成类型见 [src/constant/codeGenType.ts](src/constant/codeGenType.ts)（`html` / `multi_file`，与后端 `CodeGenTypeEnum` 对应）。

## 后端接口一览

所有请求以 `VITE_API_BASE_URL` 为前缀、携带 Cookie（`withCredentials: true`），响应 `code === 0` 表示成功（`40100` 为未登录，拦截器会跳转登录页）。

| 模块 | 接口 | 说明 |
| --- | --- | --- |
| 用户 | `POST /user/login`、`POST /user/register`、`POST /user/logout` | 登录 / 注册 / 退出 |
| 用户 | `GET /user/get/login`、`POST /user/update` | 当前登录用户、更新个人信息 |
| 用户 | `POST /user/list/page/vo`、`POST /user/delete` | 分页查询、删除（管理员） |
| 应用 | `POST /app/add` | 创建应用（返回应用 id） |
| 应用 | `POST /app/my/list/page/vo`、`POST /app/good/list/page/vo` | 我的应用、精选应用分页 |
| 应用 | `GET /app/get/vo`、`POST /app/update`、`POST /app/delete` | 详情、修改、删除（仅本人） |
| 应用 | `GET /app/chat/gen/code` | SSE 流式生成代码 |
| 应用 | `POST /app/deploy` | 部署，返回可访问地址 |
| 应用 | `POST /app/admin/list/page/vo`、`GET /app/admin/get/vo`、`POST /app/admin/update`、`POST /app/admin/delete` | 管理员版列表 / 详情 / 修改 / 删除 |

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务 |
| `npm run build` | 类型检查 + 生产构建（并行执行 `type-check` 与 `build-only`） |
| `npm run build-only` | 仅构建（跳过类型检查） |
| `npm run type-check` | `vue-tsc --build` 类型检查 |
| `npm run preview` | 预览 `dist/` 产物 |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run openapi2ts` | 依据后端 OpenAPI 文档重新生成接口层 |

## 接口层代码生成

```ts
// openapi2ts.config.ts
schemaPath: 'http://localhost:8123/api/v3/api-docs'   // 后端 OpenAPI 文档地址
serversPath: './src'                                   // 生成到 src/api
requestLibPath: "import request from '@/utils/request'" // 生成的请求走统一 Axios 实例
```

生成前请确保后端已启动；生成结果位于 [src/api](src/api)（`appController.ts`、`userController.ts`、`typings.d.ts` 等）。配置中的 `hook` 会把 `id` / `appId` / `userId` 统一改写为 `string` 类型，避免后端雪花 id 在 JS 中丢失精度。

> 目前 `src/api/index.ts`、`healthController.ts`、`staticResourceController.ts` 为生成产物且未被页面引用，保留以便后续使用（重新生成时会再次出现）。

## 开发约定

- 常量集中在 `src/constant/`，不要在页面里硬编码分页大小、优先级、枚举文案。
- 接口调用统一放 `src/api/`，请求统一走 `src/utils/request.ts`；地址拼接统一走 `src/utils/apiUrl.ts`。
- 可复用 UI 抽到 `src/components/`：页面头部用 `PageHeader`，应用卡片用 `AppCard`，弹窗用 `AppModal` / `AppDetailModal`，标签用 `AppPriorityTag` / `CodeGenTypeTag`。
- 组件样式一律 `scoped`；弹窗内容会被 teleport 到 `body`，因此相关样式用 `:global()`（见 `AppModal.vue`、`AppDetailModal.vue`）。
- 提交前建议执行 `npm run type-check` 与 `npm run format`。

## 常见问题

- **接口返回 `40100` 或登录态丢失**：后端需允许跨域携带 Cookie —— CORS 响应头需为具体源 + `Access-Control-Allow-Credentials: true`（不能使用 `*`），且前端请求带上 `withCredentials`。
- **右侧 iframe 预览 404**：确认 `VITE_APP_PREVIEW_BASE_URL` 指向后端静态资源前缀（本地为 `http://localhost:8123/api/static`），且产物目录名为 `{codeGenType}_{appId}`。
- **部署地址打不开**：`VITE_APP_DEPLOY_BASE_URL` 必须与后端 `AppConstant.CODE_DEPLOY_HOST` 一致；旧版本曾在前端写死 `http://localhost`。
- **改了 `.env` 不生效**：环境变量在构建时注入，需重启 `npm run dev` 或重新构建。
- **生成类型/优先级显示成原始值**：检查 `src/constant/codeGenType.ts`、`src/constant/app.ts` 是否与后端枚举（`CodeGenTypeEnum`、`AppConstant`）保持同步。
