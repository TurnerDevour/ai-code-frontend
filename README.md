# 应用生成平台前端（AI Coding）

基于 Vue 3 + Vite + TypeScript + Ant Design Vue 的 AI 零代码应用生成平台前端，包含主页、应用生成对话页、应用管理与应用信息修改页。

## 页面说明

| 页面 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| 主页 | `/` | 公开 | 网站标题、提示词输入框、我的应用分页列表、精选应用分页列表 |
| 应用生成对话页 | `/app/chat/:id` | 登录用户 | 左侧对话区域（用户消息在右、AI 消息在左 + 输入框），右侧网页展示区域 |
| 应用信息修改页 | `/app/edit/:id` | 登录用户（仅自己的应用） | 目前只支持修改应用名称 |
| 应用管理页 | `/admin/appManage` | 管理员 | 与用户管理页样式一致，支持编辑、删除、精选 |
| 应用信息修改页（管理员） | `/admin/appEdit/:id` | 管理员 | 支持修改应用名称、应用封面、优先级（99 为精选） |

## 关键实现

- **SSE 流式对话**：后端 `/app/chat/gen/code` 为 `text/event-stream`，`src/utils/sse.ts` 使用 `fetch` + `ReadableStream` 手动解析事件流（兼容 `id` / `event` / `data` 字段与 `\r\n` 换行），并在组件卸载时通过 `AbortController` 中断请求。
- **网站预览地址**：由 `src/api/baseUrl.ts` 统一拼接，格式为 `${VITE_API_BASE_URL}/static/{codeGenType}_{appId}/`，即本地 `http://localhost:8123/api/static/html_{appId}/`；流式接口全部返回后自动展示到右侧 iframe。
- **部署**：调用 `/app/deploy` 得到访问地址，自动复制到剪贴板并新窗口打开。
- **分页查询**：`我的应用` 使用 `/app/my/list/page/vo`，`精选案例` 使用 `/app/good/list/page/vo`，均支持按名称搜索，每页最多 20 条（主页每页 6 条，可在 `src/constant/app.ts` 中调整）。

## 常用命令

```sh
npm install          # 安装依赖
npm run dev          # 本地开发（默认 http://localhost:5173）
npm run build        # 类型检查 + 生产构建
npm run type-check   # 仅类型检查
npm run format       # Prettier 格式化 src/
```

## 环境变量

| 文件 | 变量 | 说明 |
| --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | 开发环境后端地址，默认 `http://localhost:8123/api` |
| `.env.production` | `VITE_API_BASE_URL` | 生产环境后端地址 |

> 后端需允许前端源携带 Cookie（`withCredentials`）访问，否则登录态与 SSE 接口会返回 40100/401。
