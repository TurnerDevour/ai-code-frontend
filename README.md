# AI 应用生成平台 · 前端（ai-code-frontend）

基于 **Vue 3 + Vite + TypeScript + Ant Design Vue** 的 AI 零代码应用生成平台前端：用户用一句话描述需求，AI 流式生成 HTML / 多文件 / Vue 工程代码，并在右侧实时预览、可视化编辑、一键部署。

核心链路：**首页输入提示词 → 创建应用 → 对话页流式生成 → 预览产物 → 部署上线**。

## 功能一览

| 模块     | 能力                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 首页     | 提示词创建应用（可选「代码模式」与「AI 模型」）、我的应用（搜索 / 分页 / 删除）、精选案例，卡片可直接进入对话页或打开部署站点                                                  |
| 对话页   | 流式生成正文与**思考过程**、工具调用过程展示、历史消息向前翻页、可视化编辑（点选预览元素让 AI 改）、刷新预览、新窗口打开、下载源码 zip、异步部署与状态轮询、改名、应用详情弹窗 |
| 应用编辑 | 本人可改名；管理员可改名称 / 封面 / 优先级                                                                                                                                     |
| 运营管理 | 一个菜单（标签页切换三个模块）：用户管理（分页 / 搜索 / 删除）、应用管理（分页 / 搜索 / 编辑 / 删除 / 设为精选）、对话历史管理（分页 / 多条件筛选 / 跳转对应应用）                  |
| 账号     | 登录、注册、个人中心（昵称 / 头像 / 简介），路由级与接口级双重权限校验                                                                                                         |

## 技术栈

| 分类     | 选型                                                               |
| -------- | ------------------------------------------------------------------ |
| 框架     | Vue 3（`<script setup>` + Composition API）、Vue Router 4、Pinia 3 |
| 构建     | Vite 7、TypeScript 5.8、vue-tsc                                    |
| UI       | Ant Design Vue 4、@ant-design/icons-vue                            |
| 请求     | Axios（统一实例 + 拦截器）、fetch + ReadableStream（SSE 手动解析） |
| 内容渲染 | markdown-it 15、highlight.js 11（按需注册语言 + github 主题）      |
| 时间处理 | dayjs                                                              |
| 规范     | Prettier 3（无分号 / 单引号 / 100 列）                             |
| 接口类型 | @umijs/openapi（openapi2ts）由后端 OpenAPI 文档生成                |

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

开发环境下页面请求 `/api/**`，由 [vite.config.ts](vite.config.ts) 的 dev server 代理到 `http://localhost:8123`，因此**本地不需要处理跨域**；生产环境由 `.env.production` 里的完整域名直连后端。

## 环境变量

变量只在**构建 / 启动时**注入（修改后需重启 dev server 或重新构建）。三个变量都在 [env.d.ts](env.d.ts) 中有类型声明。

| 变量                        | `.env.development`     | `.env.production`            | 说明                                                                   |
| --------------------------- | ---------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `VITE_API_BASE_URL`         | `/api`（走 Vite 代理） | `http://wlbc.top/api`        | 后端接口前缀，Axios `baseURL` 与 SSE 的地址前缀                        |
| `VITE_APP_PREVIEW_BASE_URL` | `/api/static`          | `http://wlbc.top/api/static` | 生成产物的**预览域名**（可带路径前缀）                                 |
| `VITE_APP_DEPLOY_BASE_URL`  | `http://localhost`     | `http://wlbc.top`            | 应用**部署后的访问域名**，需与后端 `AppConstant.CODE_DEPLOY_HOST` 一致 |

约定：

- 两个域名都**不要以 `/` 结尾**（代码里也会兜底去掉多余斜杠）。
- **预览域名必须与主站同源**，否则可视化编辑无法把脚本注入预览 iframe（见下文「可视化编辑」）。

## 页面与路由

| 页面                     | 路由                            | 权限               | 说明                                                                                                             |
| ------------------------ | ------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 主页                     | `/`                             | 公开               | Hero 提示词输入框（含推荐提示词）、我的应用分页列表（带删除）、精选案例分页列表，卡片可直接进入对话页            |
| 应用生成对话页           | `/app/chat/:id`                 | 登录用户           | 左侧对话区（思考过程 + Markdown 渲染 + 代码高亮）、右侧网页展示区，左:右 = 2:3；支持改名、可视化编辑、下载、部署 |
| 应用信息修改页           | `/app/edit/:id`                 | 登录用户（仅本人） | 普通用户仅可改名                                                                                                 |
| 应用信息修改页（管理员） | `/admin/appEdit/:id`            | 管理员             | 可改名称、封面、优先级（下拉选择）                                                                               |
| 运营管理（标签页）       | `/admin/operationManage`        | 管理员             | 一个菜单内用标签页切换三个模块：用户管理（分页 / 搜索 / 删除）、应用管理（分页 / 搜索 / 编辑 / 删除 / 设为精选）、对话历史管理（分页 / 多条件筛选 / 跳转对应应用）；当前标签记录在 `?tab=user / app / chatHistory`，旧地址 `/admin/userManage` 等重定向到对应标签 |
| 登录 / 注册              | `/user/login`、`/user/register` | 公开               | 登录成功写入 Pinia 登录态                                                                                        |
| 个人中心                 | `/user/profile`                 | 登录用户           | 修改昵称、头像、简介                                                                                             |

路由表见 [src/router/index.ts](src/router/index.ts)：`meta.requiresAuth` 控制登录校验、`meta.role` 控制管理员权限、`meta.showNav` 决定是否出现在顶部导航、`meta.hideHeader / hideFooter` 让对话页等铺满整屏。

## 目录结构

```
src/
├─ api/                     # 接口层（openapi2ts 生成，勿手改）
│  ├─ appController.ts        应用 / 生成 / 部署 / 下载
│  ├─ chatHistoryController.ts 对话历史
│  ├─ userController.ts       登录、注册、用户管理
│  ├─ typings.d.ts            接口出入参类型
│  └─ index.ts / healthController.ts / staticResourceController.ts  生成产物，暂未被页面引用
├─ assets/logo.png
├─ components/              # 公共组件
│  ├─ AdminSearchPanel.vue    后台筛选面板外壳（面板 + 小标题，表单项走默认插槽）
│  ├─ AdminTablePanel.vue     后台表格面板外壳（标题 + 总数 + a-table 插槽 + 表格样式）
│  ├─ AiModelTypeTag.vue      AI 模型类型标签
│  ├─ AppCard.vue             应用卡片（封面、配置标签、作者、查看对话 / 查看作品 / 删除）
│  ├─ AppDetailModal.vue      应用详情弹窗（基础信息、创建者、部署状态与时间、修改 / 删除）
│  ├─ AppModal.vue            弹窗外壳（统一标题、底部按钮与皮肤，内容 teleport 到 body）
│  ├─ AppPriorityTag.vue      优先级标签（精选 / 默认应用 / 自定义，compact 紧凑模式）
│  ├─ AppSection.vue          首页应用列表区块（标题 + 搜索 + 卡片网格 + 空态 + 分页）
│  ├─ AuthShell.vue           登录 / 注册页骨架（左宣传区 + 右表单卡片）
│  ├─ ChatMessageTypeTag.vue  对话消息类型标签
│  ├─ CodeGenTypeTag.vue      代码生成类型标签
│  ├─ DeleteAppButton.vue     删除应用的二次确认容器（确认文案集中在此，按钮外观由宿主给）
│  ├─ DeployStatusTag.vue     部署状态标签（已部署时可点击打开部署站点）
│  ├─ FormPanel.vue           表单面板容器（面板皮肤 + 控件样式 + 手机栅格兜底）
│  ├─ GlobalFooter.vue        底部版权
│  ├─ GlobalHeader.vue        顶部导航（菜单由路由表生成，窄屏折行）
│  ├─ InputHintBar.vue        输入框右下角「字数计数 + Enter / Shift+Enter 提示」
│  ├─ PageHeader.vue          页面头部（英文小标题 + 标题 + 说明 + 渐变图标）
│  ├─ PillTag.vue             胶囊标签外壳与色板（各业务标签组件的基础）
│  ├─ PromptInput.vue         首页提示词输入框（推荐提示词 + 代码模式 / AI 模型 + 发送）
│  └─ SubmitButton.vue        圆形渐变「发送 / 提交」按钮
├─ composables/             # 可复用逻辑（hooks）
│  ├─ useAccess.ts             登录态与资源归属判定（isAdmin / isOwner / canViewChat / canManage）
│  ├─ useAppDeploy.ts          异步部署：提交 + 轮询 + 超时保护 + 按钮状态
│  ├─ useDeleteApp.ts          删除应用：请求 + 提示 + 收尾回调（首页卡片与详情弹窗共用）
│  ├─ useEnterSubmit.ts        输入框「回车提交、Shift + Enter 换行、输入法组合不提交」
│  ├─ useMarkdownThrottle.ts   Markdown 渲染节流（流式输出按 100ms 重渲染）
│  ├─ useMessage.ts            消息提示与「前缀 + 后端 message」的统一处理
│  └─ usePagedQuery.ts         分页列表查询（查询条件 / 数据 / 分页 / 搜索 / 翻页 / 删除后刷新）
├─ constant/                # 常量（枚举取值与后端保持一致）
│  ├─ access.ts                角色：admin / user
│  ├─ aiModelType.ts           AI 模型类型与下拉选项
│  ├─ app.ts                   优先级、分页大小、推荐提示词
│  ├─ chat.ts                  消息类型、历史分页大小、输入上限
│  ├─ codeGenType.ts           代码生成类型与下拉选项
│  └─ deploy.ts                部署状态、展示配置、进行中 / 终态判定
├─ layouts/BasicLayout.vue  # 应用外壳：固定头尾 + 中间内容区滚动
├─ pages/
│  ├─ HomePage.vue            主页
│  ├─ admin/                  OperationManagePage（运营管理：标签页容器）+ panels/（用户 / 应用 / 对话历史三个面板）
│  ├─ app/                    AppChatPage（对话与预览）/ AppEditPage（应用信息）
│  └─ user/                   UserLoginPage / UserRegisterPage / UserProfilePage
├─ router/index.ts          # 路由表（含权限与导航元信息）
├─ stores/
│  ├─ useGenerationStore.ts   生成会话（SSE 发起、续订、持久化，不随路由卸载中断）
│  └─ useLoginUserStore.ts    登录用户
├─ utils/
│  ├─ apiUrl.ts               预览 / 部署地址拼接、接口地址前缀
│  ├─ deploy.ts               部署状态文案与错误提示
│  ├─ enumOptions.ts          枚举「value → 中文名称」查询函数的统一构造
│  ├─ fileDownload.ts         Content-Disposition 解析、Blob 存盘、Blob 错误体解析
│  ├─ markdown.ts             markdown-it + highlight.js 渲染
│  ├─ request.ts              统一 Axios 实例与响应拦截器
│  ├─ sse.ts                  fetch + ReadableStream 的 SSE 消费器
│  ├─ streamMessage.ts        VUE_PROJECT 流式消息解析
│  ├─ time.ts                 dayjs 时间解析与格式化
│  └─ visualEditor.ts         预览 iframe 的可视化编辑（脚本注入 + postMessage 协议）
├─ App.vue                  # 根组件（RouterView）
├─ main.ts                  # 应用入口（Pinia、Router、Antd、reset.css）
└─ permission.ts            # 全局路由守卫
```

## 核心链路与关键实现

### 1. 流式生成（SSE）

- 生成接口是 `GET /app/chat/gen/code`，返回 `text/event-stream`。浏览器原生 `EventSource` 不支持自定义请求头与 `withCredentials` 场景，因此 [src/utils/sse.ts](src/utils/sse.ts) 用 `fetch` + `ReadableStream` 手动解析：兼容 `id` / `event` / `data` 三种字段、`\r\n` 换行与多行 `data`，`data` 为 JSON 时自动反序列化，并支持通过 `AbortController` 中断。
- VUE_PROJECT 模式下每个 `data` 帧都是 JSON，结构见 [src/utils/streamMessage.ts](src/utils/streamMessage.ts)（与后端 `StreamMessageTypeEnum` 一致）：

  | type            | 含义               | 前端处理                                                          |
  | --------------- | ------------------ | ----------------------------------------------------------------- |
  | `ai_response`   | 给用户看的正文     | 追加到会话正文，Markdown 渲染                                     |
  | `ai_thinking`   | 推理模型的思考过程 | 单独累积，只进「AI 思考过程」面板，不混进正文                     |
  | `tool_request`  | 工具调用请求       | 显示一行工具说明                                                  |
  | `tool_executed` | 工具执行结果       | **优先渲染后端下发的 `display`**，无 `display` 时才走前端兜底格式 |
  | `error`         | 生成失败的错误原因 | 会话置为 error 并展示原因                                         |

  > `error` 走的是 `data:` 帧而不是 `event: error`，避免与 SSE 自身的错误 / 重连语义混淆。

### 2. 生成会话挂在 Pinia，不随路由卸载中断

[src/stores/useGenerationStore.ts](src/stores/useGenerationStore.ts) 是整个应用最复杂的一块，解决的问题是：**用户点返回 / 刷新 / 断网时，生成不能白跑**。

- 生成请求由 store 发起，Pinia 实例不随路由卸载销毁；页面离开只是解除 UI 订阅。
- 会话快照节流写入 `sessionStorage`（生命周期正好是「当前标签页」），整页刷新或浏览器前进 / 后退回来仍能恢复内容；带 6 小时 TTL，正文与思考过程各有落盘上限，避免撑爆配额。
- 每帧带 SSE `id`（帧序号）：`lastSeq` 记录已收到的最新序号，`appliedSeq` 做幂等去重，保证补发 + 实时推送重叠时不重复渲染。
- 断网或刷新回来后调 `GET /app/chat/gen/resume?fromSeq=已收到序号` 续订，服务端先补发缺失帧再继续实时推送，**零丢失、零重复**；失败按 800 / 1500 / 3000 / 5000 / 8000ms 退避重连，最多 5 次。
- 每轮生成带独立 `roundId`：页面订阅先比对轮次，轮次不同立即解绑。否则第 2 轮把内容重置为空时，上一轮遗留的订阅会把「长度从 0 增长」误判成「内容变短」，出现第一轮消息被清空的 bug。
- 只有**切换应用**、**用户主动停止**才真正中断（`manualStops` 与「断网自动续订」区分开）。

### 3. 预览与异步部署

[src/utils/apiUrl.ts](src/utils/apiUrl.ts) 统一拼接地址，两种地址语义不同**不可混用**：

- 生成产物预览：`${VITE_APP_PREVIEW_BASE_URL}/{codeGenType}_{appId}/`；Vue 工程模式是 `.../vue_project_{appId}/dist/index.html`，且 `dist` 由后端在生成结束后**异步构建**。
- 部署后访问：`${VITE_APP_DEPLOY_BASE_URL}/{deployKey}/`。

部署是异步的（[src/composables/useAppDeploy.ts](src/composables/useAppDeploy.ts)）：

- `POST /app/deploy/async` 毫秒级返回，随后 `GET /app/deploy/status` 每 1.5s 轮询，总超时 15 分钟（覆盖首次 `npm install` 偏慢的情况）。
- 状态机 `idle → queued → deploying → ready / failed`，其中 `queued` / `deploying` 算「进行中」，需要继续轮询（见 [src/constant/deploy.ts](src/constant/deploy.ts)）。
- 页面切到后台时只保留轮询节奏、不发请求，恢复可见后把隐藏时长顺延给超时时间。
- 后端额外下发 `deployStale`（已部署的产物落后于当前代码）。生成结束后会重新同步一次状态，否则「先部署 → 再用 AI 改代码」之后按钮会一直是灰的「已部署」，用户点不动。
- 生成结束后的预览刷新编排：Vue 工程要等后端构建完成——查 `/app/chat/gen/status` 的 `buildStatus`，未完成就轮询到 `finished` / `failed`；服务端已经没有该任务时立刻刷新，避免空转轮询。

### 4. 可视化编辑

[src/utils/visualEditor.ts](src/utils/visualEditor.ts) 让用户直接在预览里点选元素，再让 AI 针对这一块修改：

- 生成的网站本身不含任何编辑器逻辑，由主站把一段编辑脚本**注入预览 iframe 的文档**（要求同源，可直接拿到 `contentDocument`）。
- 编辑脚本负责悬浮高亮与点击选中，通过 `window.parent.postMessage` 回传元素信息（标签名、id、class、祖先链选择器、文本、`outerHTML` 摘要）。
- 主站下发 `enable` / `disable` / `clear` 指令；600ms 内收不到回执就判定脚本没跑起来，回滚编辑模式并提示具体原因（不静默失败）。
- 选中元素后发消息时，元素信息会被拼进提示词（`buildVisualEditPrompt`），AI 才知道要改页面上的哪一块。

### 5. 登录态与权限

- 登录用户信息存于 [src/stores/useLoginUserStore.ts](src/stores/useLoginUserStore.ts)。
- [src/permission.ts](src/permission.ts) 首次导航时拉取一次当前用户（`GET /user/get/login`）：`requiresAuth` 未登录跳登录页并携带 `redirect`，`meta.role === 'admin'` 非管理员拦回首页。
- [src/utils/request.ts](src/utils/request.ts) 的响应拦截器统一处理 `40100`（未登录）：提示后跳登录页。
- 页面内的归属 / 管理员判定统一走 [useAccess](src/composables/useAccess.ts)：`isOwner` 是严格判定（双方 id 都在才认），`canViewChat` 是宽松判定（id 缺失时不拦截，用于列表卡片），同时兼容后端两种返回（`app.userId` 与 `app.user?.id`）。

### 6. 列表分页与搜索

列表页统一走 [usePagedQuery](src/composables/usePagedQuery.ts)，它一次给出：查询条件（`pageNum` / `pageSize`）、`dataList` / `total` / `loading`、antd 的 `pagination`、`search` / `changePage` / `changePageNum`、`reloadAfterRemove`、输入框清空即刷新，以及首次挂载请求。页面只提供「调哪个接口」与文案。

其中 `reloadAfterRemove(id)` 是「删完自动刷新」的统一实现：**先在本地把这条记录摘掉**（立即生效、不依赖后续请求，所以用户点完「确定」卡片就消失），**再重新拉一页校准** `total` 与空出来的位置；当前页被删空时自动回退一页。重新拉取失败时保留本地已摘除的列表并提示一次，不会把刚删掉的卡片又显示回来。

主页两块列表、运营管理下的三个标签页都用它。分页大小集中在 [src/constant/app.ts](src/constant/app.ts)：主页 `HOME_PAGE_SIZE = 6`、管理页 `MANAGE_PAGE_SIZE = 10`。对话页的历史消息是**游标翻页**（按最旧一条的 `createTime` 向前取），因此不走这个 hook。

> 标签页的懒挂载：`a-tab-pane` 只在首次激活时渲染内容，因此三个面板（各自在 `onMounted` 里发请求）会在切到对应标签时才请求一次，之后切换保留列表与查询条件。

### 7. 其它通用能力

- **Markdown 渲染**：[src/utils/markdown.ts](src/utils/markdown.ts) 用 markdown-it 解析 + highlight.js 高亮（只注册 `xml`(html) / `css` / `javascript`，避免全量语言包），引入 `github` 主题；关闭原始 HTML 解析防注入、开启 `linkify` 与 `breaks`、链接统一新窗口打开。流式输出按 100ms 节流重渲染，流结束时立即渲染一次收敛结果（[useMarkdownThrottle](src/composables/useMarkdownThrottle.ts)）。
- **时间格式化**：[src/utils/time.ts](src/utils/time.ts) 基于 dayjs。后端时间格式并不统一（列表 / 详情是 `2026-10-07 13:42:47`，部署状态是 ISO 8601 的 `2026-10-07T13:45:08`），`formatDateTime` 统一成 `YYYY-MM-DD HH:mm:ss`，无法解析时原样返回不丢数据。
- **源码下载**：[src/utils/fileDownload.ts](src/utils/fileDownload.ts) 处理 `GET /app/download/{appId}` 的 zip 流——按 Blob 接收、从 `Content-Disposition` 解析文件名（兼容 RFC 5987 的 `filename*`），并识别「HTTP 200 但响应体是 JSON 错误」的情况。
- **优先级约定**：`GOOD_APP_PRIORITY = 99`（精选，首页「精选案例」来源）、`DEFAULT_APP_PRIORITY = 0`（默认），与后端 `AppConstant` 对齐；其他数值按「自定义」展示。

## 公共组件与 Hooks 速查

新增页面前先看这里，避免重复造轮子：

| 我要做的事                     | 用什么                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| 页面头部（标题 + 说明 + 图标） | `PageHeader`                                                                                |
| 列表分页 / 搜索 / 删除后刷新   | [`usePagedQuery`](src/composables/usePagedQuery.ts)                                         |
| 弹窗                           | `AppModal`（外壳）、`AppDetailModal`（应用详情）                                            |
| 状态胶囊标签                   | `PillTag`（色板 + 图标 + 文案），业务标签组件只是它的薄封装                                 |
| 后台的筛选面板 / 表格面板      | `AdminSearchPanel` / `AdminTablePanel`                                                      |
| 表单面板                       | `FormPanel`（`panel=false` 时不带卡片外壳）                                                 |
| 登录 / 注册页骨架              | `AuthShell`                                                                                 |
| 消息提示                       | [`useMessage`](src/composables/useMessage.ts)，不要直接写 `message.xxx(...).then(() => {})` |
| 权限判定                       | [`useAccess`](src/composables/useAccess.ts)                                                 |
| 删除应用                       | `DeleteAppButton` + [`useDeleteApp`](src/composables/useDeleteApp.ts)                       |
| 输入框回车行为                 | [`useEnterSubmit`](src/composables/useEnterSubmit.ts) + `SubmitButton` + `InputHintBar`     |
| 部署                           | [`useAppDeploy`](src/composables/useAppDeploy.ts)                                           |
| 枚举 `value → 中文名称`        | [`createEnumNameGetter`](src/utils/enumOptions.ts)                                          |

## 后端接口一览

所有请求以 `VITE_API_BASE_URL` 为前缀、携带 Cookie（`withCredentials: true`），响应 `code === 0` 表示成功（`40100` 为未登录，拦截器会跳转登录页）。

| 模块     | 接口                                                                                                        | 说明                                       |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 用户     | `POST /user/login`、`POST /user/register`、`POST /user/logout`                                              | 登录 / 注册 / 退出                         |
| 用户     | `GET /user/get/login`、`POST /user/update`                                                                  | 当前登录用户、更新个人信息                 |
| 用户     | `POST /user/list/page/vo`、`POST /user/delete`                                                              | 分页查询、删除（管理员）                   |
| 应用     | `POST /app/add`                                                                                             | 创建应用（返回应用 id）                    |
| 应用     | `POST /app/my/list/page/vo`、`POST /app/good/list/page/vo`                                                  | 我的应用、精选应用分页                     |
| 应用     | `GET /app/get/vo`、`POST /app/update`、`POST /app/delete`                                                   | 详情、修改、删除（仅本人）                 |
| 应用     | `POST /app/admin/list/page/vo`、`GET /app/admin/get/vo`、`POST /app/admin/update`、`POST /app/admin/delete` | 管理员版列表 / 详情 / 修改 / 删除          |
| 生成     | `GET /app/chat/gen/code`                                                                                    | SSE 流式生成代码                           |
| 生成     | `GET /app/chat/gen/resume?fromSeq=`                                                                         | 按帧序号续订（刷新 / 断网恢复）            |
| 生成     | `GET /app/chat/gen/status`                                                                                  | 生成与构建状态（Vue 工程等 `buildStatus`） |
| 部署     | `POST /app/deploy/async`、`GET /app/deploy/status`                                                          | 提交异步部署、轮询部署状态                 |
| 下载     | `GET /app/download/{appId}`                                                                                 | 下载应用源码 zip                           |
| 对话历史 | `POST /chatHistory/app/{appId}`                                                                             | 某应用的对话历史分页（游标翻页）           |
| 对话历史 | `POST /chatHistory/admin/list/page`                                                                         | 全平台对话分页（管理员）                   |

> `POST /app/deploy`（同步部署）与 `/user/add`、`/user/get`、`/user/get/vo`、`/health*` 等接口在 [src/api](src/api) 中存在，但当前页面未使用。

## 构建产物与部署

```sh
npm run build      # 产物在 dist/
npm run preview    # 本地起静态服务预览 dist/
```

上线时需要注意两点：

- **服务端必须配置 SPA 回退**：路由用的是 `createWebHistory`（无 `#`），直接访问或刷新 `/app/chat/123` 这类深层地址时，需要把未命中的请求重写回 `index.html`，否则会 404。Nginx 示例：

  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```

- **子路径部署要改 `base`**：[vite.config.ts](vite.config.ts) 未设置 `base`，默认部署在域名根路径。若部署到 `/xxx/` 子路径，需同时设置 `base: '/xxx/'` 与 `createWebHistory('/xxx/')`。

## 常用命令

| 命令                 | 作用                                                         |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | 启动开发服务                                                 |
| `npm run build`      | 类型检查 + 生产构建（并行执行 `type-check` 与 `build-only`） |
| `npm run build-only` | 仅构建（跳过类型检查）                                       |
| `npm run type-check` | `vue-tsc --build` 类型检查                                   |
| `npm run preview`    | 预览 `dist/` 产物                                            |
| `npm run format`     | Prettier 格式化 `src/`                                       |
| `npm run openapi2ts` | 依据后端 OpenAPI 文档重新生成接口层                          |

## 接口层代码生成

```ts
// openapi2ts.config.ts
schemaPath: 'http://localhost:8123/api/v3/api-docs' // 后端 OpenAPI 文档地址
serversPath: './src' // 生成到 src/api
requestLibPath: "import request from '@/utils/request'" // 生成的请求走统一 Axios 实例
```

生成前请确保后端已启动；生成结果位于 [src/api](src/api)。配置中的 `hook` 会把 `id` / `appId` / `userId` 统一改写为 `string` 类型，避免后端雪花 id 在 JS 中丢失精度。

> `src/api` 是工具的产物，**不要手改**：重新生成会覆盖。需要额外参数（如下载接口的 `responseType: 'blob'`）时，通过生成函数已有的 `options` 形参传入。

## 开发约定

- 常量集中在 `src/constant/`，不要在页面里硬编码分页大小、优先级、枚举文案；枚举的「value → 中文名称」映射统一用 [`createEnumNameGetter`](src/utils/enumOptions.ts) 构造。
- 接口调用统一放 `src/api/`，请求统一走 `src/utils/request.ts`；地址拼接统一走 `src/utils/apiUrl.ts`。
- 可复用 **UI** 抽到 `src/components/`，可复用 **逻辑** 抽到 `src/composables/`（对照上文的速查表），不要在页面里复制粘贴第二份。
- 组件样式优先 `scoped`；**通过插槽传入的子内容**（表单、`a-table` 等）带的是父组件的 scopeId，父组件选不中它们，因此这类样式放在非 scoped 样式块里，并以组件根类名（`.admin-search-panel` / `.admin-table-panel` / `.auth-card` / `.form-panel` 等）收敛作用范围。弹窗内容会被 teleport 到 `body`，相关样式用 `:global()`（见 `AppModal.vue`、`AppDetailModal.vue`）。
- 语义色沿用现有体系：主色渐变 `#1677ff → #5e63f2`，危险色 `#e85d75`，正文 `#3c5677` / 次要 `#8190a5`；胶囊类标签统一走 `PillTag` 的色板，不要各写一套。
- 运营管理页（[OperationManagePage](src/pages/admin/OperationManagePage.vue)）的**高度是锁死的**（`height: 100%` 而非 `min-height`），配合 `a-tabs` 内部逐层 `flex` + `min-height: 0`，把内容区剩余高度全部让给列表区域；列表由 [AdminTablePanel](src/components/AdminTablePanel.vue) 的 `.ant-table` 自己滚动（`overflow: auto` + 表头 `position: sticky`），分页常驻卡片底部，因此**整页不出现滚动条**。改动这条链路上的任意一层（把 `height` 改回 `min-height`、加 `overflow: hidden` 等）都会让列表重新撑高整页。窄屏（`max-width: 760px`）与极矮视口（`max-height: 640px`）下会自动退回「整页滚动」，因为筛选表单此时会折行、固定高度会把列表压没。
- 破坏性操作（删除等）一律二次确认，确认文案集中在 `DeleteAppButton`。
- 提交前执行 `npm run type-check` 与 `npm run format`。

## 常见问题

- **接口返回 `40100` 或登录态丢失**：后端需允许跨域携带 Cookie —— CORS 响应头需为具体源 + `Access-Control-Allow-Credentials: true`（不能使用 `*`），且前端请求带上 `withCredentials`。本地开发走 Vite 代理时是同源请求，不受此限制。
- **右侧 iframe 预览 404**：确认 `VITE_APP_PREVIEW_BASE_URL` 指向后端静态资源前缀（本地为 `/api/static`），且产物目录名为 `{codeGenType}_{appId}`；Vue 工程模式还要确认 `dist` 已构建完成（预览会自动等 `buildStatus`）。
- **可视化编辑点不动 / 提示不可用**：预览域名必须与主站**同源**，否则脚本无法注入；另外确认生成的页面没有被 `X-Frame-Options` / CSP 拦在 iframe 外。
- **部署地址打不开**：`VITE_APP_DEPLOY_BASE_URL` 必须与后端 `AppConstant.CODE_DEPLOY_HOST` 一致；旧版本曾在前端写死 `http://localhost`。
- **部署按钮一直是灰的「已部署」**：按钮可用性取决于后端下发的 `deployStale`。代码改过时会重新同步（生成结束会拉一次），若仍如此请检查 `/app/deploy/status` 是否返回了该字段。
- **刷新后对话内容消失**：生成会话存在 `sessionStorage`（键前缀 `dsh:generation:`），关掉标签页即清理；另外超过 6 小时 TTL 或单条内容超过落盘上限时不会恢复，此时以对话历史为准。
- **改了 `.env` 不生效**：环境变量在构建时注入，需重启 `npm run dev` 或重新构建。
- **刷新深层路由 404**：路由是 history 模式，静态服务需配置 SPA 回退（见「构建产物与部署」）。
- **dev server 被编辑器临时目录打挂**：`vite.config.ts` 已忽略 `**/.*.tmpdir`，如仍有 `EBUSY` 请检查是否有其它工具在 `src/` 下频繁创建临时目录。
- **生成类型 / 优先级显示成原始值**：检查 `src/constant/codeGenType.ts`、`src/constant/aiModelType.ts`、`src/constant/app.ts` 是否与后端枚举（`CodeGenTypeEnum`、`AIModelTypeEnum`、`AppConstant`）保持同步。
