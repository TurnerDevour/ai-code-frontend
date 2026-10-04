<template>
  <div class="app-chat-page">
    <!-- 顶部栏：应用名称 + 部署按钮 -->
    <header class="chat-header">
      <div class="header-left">
        <a-tooltip title="返回首页">
          <button type="button" class="back-button" @click="goHome">
            <ArrowLeftOutlined />
          </button>
        </a-tooltip>
        <div class="app-avatar">
          <img src="@/assets/logo.png" alt="应用" />
        </div>
        <a-dropdown :trigger="['click']" placement="bottomLeft">
          <button type="button" class="app-name-button">
            <span class="app-name">{{ app.appName || '未命名应用' }}</span>
            <DownOutlined class="app-name-icon" />
          </button>
          <template #overlay>
            <a-menu>
              <a-menu-item v-if="canChat" key="rename" @click="openRenameModal">
                <EditOutlined />
                修改应用名称
              </a-menu-item>
              <a-menu-item v-if="canChat" key="edit" @click="goToEditPage">
                <SettingOutlined />
                应用信息修改
              </a-menu-item>
              <a-menu-divider v-if="canChat" />
              <a-menu-item key="refresh" @click="refreshPreview">
                <ReloadOutlined />
                刷新预览
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="header-right">
        <a-button class="detail-button" @click="openDetailModal">
          <template #icon><ProfileOutlined /></template>
          应用详情
        </a-button>
        <a-button v-if="canChat" class="deploy-button" :loading="deploying" @click="handleDeploy">
          <template #icon><CloudUploadOutlined /></template>
          部署
        </a-button>
      </div>
    </header>

    <!-- 核心内容区域 -->
    <div class="chat-body">
      <!-- 左侧对话区域 -->
      <section class="chat-panel">
        <div ref="messageListRef" class="message-list">
          <!-- 加载更多：历史消息还有更早的记录时，在消息上方展示入口 -->
          <div v-if="hasMoreHistory" class="history-more">
            <a-button class="load-more-button" :loading="historyLoading" @click="loadMoreHistory">
              <template #icon><HistoryOutlined /></template>
              加载更多
            </a-button>
          </div>
          <div v-else-if="historyLoading" class="history-more">
            <a-spin size="small" />
            <span class="history-more-tip">正在加载历史消息…</span>
          </div>
          <a-empty
            v-if="!messages.length && !generating && !historyLoading"
            class="message-empty"
            description="描述你的想法，AI 会为你生成完整应用"
          />
          <div
            v-for="item in messages"
            :key="item.id"
            class="message-row"
            :class="item.role === 'user' ? 'is-user' : 'is-ai'"
          >
            <div class="message-avatar">
              <img v-if="item.role === 'ai'" src="@/assets/logo.png" alt="AI" />
              <UserOutlined v-else />
            </div>
            <div class="message-bubble">
              <!-- 用户消息是纯文本，AI 回复走 Markdown 渲染 -->
              <div v-if="item.role === 'user'" class="message-content is-plain-text">
                {{ item.content }}
              </div>
              <div v-else class="message-content markdown-body" v-html="item.html"></div>
              <div v-if="item.role === 'ai' && item.status === 'loading'" class="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div v-else-if="item.role === 'ai' && item.status === 'error'" class="error-tip">
                <ExclamationCircleOutlined />
                <span>{{ item.errorMessage || '生成失败，请重试' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户消息输入框 -->
        <div class="input-wrapper">
          <a-tooltip :title="canChat ? '' : '无法在别人的作品下对话哦~'">
            <div class="input-card" :class="{ 'is-readonly': !canChat }">
              <a-textarea
                v-model:value="userInput"
                class="chat-textarea"
                :rows="3"
                :maxlength="2000"
                :disabled="generating || !canChat"
                :placeholder="
                  canChat
                    ? '请描述你想生成的网站，越详细效果越好哦'
                    : '这是别人的作品，无法在此对话'
                "
              />
              <div class="input-toolbar">
                <button
                  type="button"
                  class="send-button"
                  :disabled="generating || !canChat || !userInput.trim()"
                  @click="handleSend"
                >
                  <LoadingOutlined v-if="generating" />
                  <ArrowUpOutlined v-else />
                </button>
              </div>
            </div>
          </a-tooltip>
        </div>
      </section>

      <!-- 右侧网页展示区域 -->
      <section class="preview-panel">
        <div class="preview-header">
          <div class="preview-title">
            <EyeOutlined />
            <span>生成后的网页展示</span>
          </div>
          <div class="preview-actions">
            <a-tooltip title="刷新预览">
              <button
                type="button"
                class="preview-icon-button"
                :disabled="!previewUrl"
                @click="refreshPreview"
              >
                <ReloadOutlined />
              </button>
            </a-tooltip>
            <a-tooltip title="新窗口打开">
              <button
                type="button"
                class="preview-icon-button"
                :disabled="!previewUrl"
                @click="openPreview"
              >
                <ExportOutlined />
              </button>
            </a-tooltip>
          </div>
        </div>
        <div class="preview-body">
          <iframe
            v-if="previewUrl"
            :key="previewKey"
            class="preview-iframe"
            :src="previewUrl"
            title="应用预览"
          />
          <div v-else class="preview-placeholder">
            <a-spin v-if="generating" size="large" />
            <template v-else>
              <div class="placeholder-icon">
                <DesktopOutlined />
              </div>
              <p class="placeholder-title">网页展示区域</p>
              <p class="placeholder-tip">与 AI 对话生成网站应用，生成完成后将自动在此处展示效果</p>
            </template>
          </div>
        </div>
      </section>
    </div>

    <!-- 应用详情悬浮窗 -->
    <AppDetailModal
      v-model:open="detailModalOpen"
      :app="app"
      :can-manage="canChat"
      :deleting="deleting"
      @edit="handleDetailEdit"
      @delete="handleDetailDelete"
    />

    <!-- 应用名称修改悬浮窗 -->
    <AppModal
      v-model:open="renameModalOpen"
      title="修改应用名称"
      :icon="EditOutlined"
      :width="420"
      :confirm-loading="renaming"
      confirm-text="保存"
      @confirm="handleRename"
    >
      <a-input
        v-model:value="renameValue"
        :maxlength="50"
        placeholder="请输入应用名称"
        @press-enter="handleRename"
      />
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CloudUploadOutlined,
  DesktopOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  EyeOutlined,
  HistoryOutlined,
  LoadingOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { deleteApp, deployApp, getAppVoById, updateApp } from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import AppDetailModal from '@/components/AppDetailModal.vue'
import AppModal from '@/components/AppModal.vue'
import { getStaticUrl } from '@/utils/apiUrl'
import { renderMarkdown } from '@/utils/markdown'
import { streamSse } from '@/utils/sse'
import {
  STREAM_MESSAGE_TYPE,
  parseStreamMessage,
  parseToolArguments,
} from '@/utils/streamMessage'
import { parseTime } from '@/utils/time'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { ACCESS } from '@/constant/access'
import {
  CHAT_HISTORY_PAGE_SIZE,
  CHAT_MESSAGE_TYPE,
  MIN_CHAT_HISTORY_FOR_PREVIEW,
} from '@/constant/chat'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  /** AI 回复的 Markdown 渲染结果（流式输出时节流更新） */
  html: string
  status: 'done' | 'loading' | 'error'
  /** 出错时后端下发的错误原因（error 帧的 data），展示给用户 */
  errorMessage?: string
}

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => String(route.params.id ?? ''))
const app = ref<API.AppVO>({})
/** 从后端加载的历史消息（按创建时间升序，旧的在前） */
const historyMessages = ref<ChatMessage[]>([])
/** 本次进入页面后新产生的消息（用户发送的消息 + AI 回复） */
const sessionMessages = ref<ChatMessage[]>([])
/** 历史消息与本次会话消息拼接后的完整消息列表：历史在前，新消息在后 */
const messages = computed<ChatMessage[]>(() => [...historyMessages.value, ...sessionMessages.value])
/** 历史消息加载中 */
const historyLoading = ref(false)
/** 该应用在服务端保存的对话记录总数 */
const historyTotal = ref(0)
/** 游标：已加载历史中最旧一条消息的创建时间，用于向前加载更早的消息 */
const historyCursor = ref('')
/** 是否还有更早的历史消息（一页 10 条，取满一页说明可能还有） */
const hasMoreHistory = ref(false)
/** 是否成功加载过对话历史（加载失败时不能认为「没有对话历史」） */
const historyLoaded = ref(false)
const userInput = ref('')
const generating = ref(false)
const deploying = ref(false)
const previewUrl = ref('')
const previewKey = ref(0)
const messageListRef = ref<HTMLElement | null>(null)
const renameModalOpen = ref(false)
const renameValue = ref('')
const renaming = ref(false)
const detailModalOpen = ref(false)
const deleting = ref(false)

// 是否为当前用户自己的应用（管理员也视为可管理）
const isOwner = computed(() => {
  const loginUserId = loginUserStore.loginUser.id
  if (!loginUserId || !app.value.userId) {
    return false
  }
  return String(app.value.userId) === String(loginUserId)
})

// 只有自己的应用才能在对话页发消息
const canChat = computed(() => {
  return isOwner.value || loginUserStore.loginUser.userRole === ACCESS.ADMIN
})

let messageIdSeed = 0
let abortController: AbortController | null = null

const createMessageIdGenerator = () => {
  messageIdSeed += 1
  return `msg-${Date.now()}-${messageIdSeed}`
}

// 流式输出的分片很密，而 Markdown 解析 + 代码高亮都有成本：
// 这里按 100ms 节流重渲染，流结束时再立即渲染一次，兼顾实时展示与流畅度
const MARKDOWN_RENDER_INTERVAL = 100
const renderTimers = new Map<string, number>()

// 立即渲染（流结束、报错时调用）
const flushMarkdown = (message: ChatMessage) => {
  const timer = renderTimers.get(message.id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    renderTimers.delete(message.id)
  }
  message.html = renderMarkdown(message.content)
}

// 节流渲染（流式追加内容时调用）
const scheduleMarkdown = (message: ChatMessage) => {
  if (renderTimers.has(message.id)) {
    return
  }
  const timer = window.setTimeout(() => {
    renderTimers.delete(message.id)
    message.html = renderMarkdown(message.content)
  }, MARKDOWN_RENDER_INTERVAL)
  renderTimers.set(message.id, timer)
}

// 切换应用、离开页面时清掉还没触发的定时器
const clearMarkdownTimers = () => {
  renderTimers.forEach((timer) => window.clearTimeout(timer))
  renderTimers.clear()
}

// 生成预览地址：{VITE_APP_PREVIEW_BASE_URL}/{codeGenType}_{appId}/（见 utils/apiUrl.ts）
// codeGenType 取自应用详情（app.codeGenType，如 multi_file / html）
const buildPreviewUrl = () => {
  return getStaticUrl(app.value.codeGenType, appId.value)
}

const scrollToBottom = async () => {
  await nextTick()
  const container = messageListRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

// 获取应用信息
const fetchApp = async () => {
  if (!appId.value) {
    return
  }
  const res = await getAppVoById({ id: appId.value })
  if (res.data.code === 0 && res.data.data) {
    app.value = res.data.data
  } else {
    message.error('获取应用信息失败，' + res.data.message).then(() => {})
  }
}

// 后端按创建时间降序返回，这里统一转成升序（旧消息在前）
const sortRecordsByCreateTimeAsc = (records: API.ChatHistory[]) =>
  [...records].sort((first, second) => parseTime(first.createTime) - parseTime(second.createTime))

// 把后端返回的对话记录转换为页面消息
// 历史中的错误消息（messageType = error）内容即失败原因，直接按 AI 消息展示
const toChatMessage = (record: API.ChatHistory): ChatMessage => ({
  id: `history-${record.id}`,
  role: record.messageType === CHAT_MESSAGE_TYPE.USER ? 'user' : 'ai',
  content: record.message ?? '',
  html: renderMarkdown(record.message ?? ''),
  status: 'done',
})

/**
 * 加载对话历史
 * @param loadMore 为 true 时带上游标向前加载更早的一页，否则加载最新一页
 */
const loadHistory = async (loadMore = false) => {
  if (!appId.value || historyLoading.value) {
    return
  }
  if (loadMore && (!hasMoreHistory.value || !historyCursor.value)) {
    return
  }
  historyLoading.value = true
  try {
    const res = await listAppChatHistory(
      { appId: appId.value },
      {
        pageNum: 1,
        pageSize: CHAT_HISTORY_PAGE_SIZE,
        // 不传游标时查询最新的消息，传入游标时只查询比该时间更早的消息
        ...(loadMore ? { lastCreateTime: historyCursor.value } : {}),
      },
    )
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取对话历史失败，' + res.data.message).then(() => {})
      return
    }
    const historyPage = res.data.data
    historyLoaded.value = true
    const records = historyPage.records ?? []
    const sortedRecords = sortRecordsByCreateTimeAsc(records)
    const pageMessages = sortedRecords.map(toChatMessage)
    historyTotal.value = Number(historyPage.totalRow ?? pageMessages.length)
    // 本页最旧的一条消息的创建时间，作为下一次向前加载的游标
    const oldestRecord = sortedRecords[0]
    if (oldestRecord?.createTime) {
      historyCursor.value = oldestRecord.createTime
    }
    // 取满一页说明可能还有更早的消息
    hasMoreHistory.value = records.length >= CHAT_HISTORY_PAGE_SIZE
    historyMessages.value = loadMore ? [...pageMessages, ...historyMessages.value] : pageMessages
  } finally {
    historyLoading.value = false
  }
}

// 加载更多历史消息：加载后保持当前阅读位置不跳动
const loadMoreHistory = async () => {
  const container = messageListRef.value
  const previousScrollHeight = container?.scrollHeight ?? 0
  const previousScrollTop = container?.scrollTop ?? 0
  await loadHistory(true)
  await nextTick()
  if (container) {
    container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight)
  }
}

// 调用 SSE 接口生成代码
const genCode = async (prompt: string) => {
  const aiMessageId = createMessageIdGenerator()
  sessionMessages.value.push({
    id: aiMessageId,
    role: 'ai',
    content: '',
    html: '',
    status: 'loading',
  })
  // 通过 id 定位消息，保证流式追加时响应式更新
  const updateAiMessage = (updater: (message: ChatMessage) => void) => {
    const target = sessionMessages.value.find((item) => item.id === aiMessageId)
    if (target) {
      updater(target)
    }
  }
  // 追加流式文本分片（节流渲染）
  const appendChunk = (chunk: string) => {
    if (!chunk) {
      return
    }
    updateAiMessage((target) => {
      target.content += chunk
      scheduleMarkdown(target)
    })
    scrollToBottom()
  }
  // 追加工具写入结果：把写入的文件路径与内容渲染成 Markdown 代码块
  const appendToolExecutedMessage = (args: string) => {
    const file = parseToolArguments(args)
    if (!file) {
      return
    }
    const suffix = file.relativePath.split('.').pop() ?? ''
    const fence = suffix && suffix !== file.relativePath ? suffix : 'text'
    appendChunk(`\n\n[🔧 工具调用] 写入文件 ${file.relativePath}\n\n\`\`\`${fence}\n${file.content}\n\`\`\`\n\n`)
  }
  // 本次生成是否已失败：失败后不再刷新预览，避免展示半成品
  let hasError = false
  // 标记该条消息生成失败：error 帧已带回原因，展示时优先用后端下发的文案
  const markGenerationFailed = (reason: string) => {
    updateAiMessage((target) => {
      target.status = 'error'
      target.errorMessage = reason
      // 立即渲染一次，保证报错前已收到的内容排版完整
      flushMarkdown(target)
    })
    hasError = true
  }
  generating.value = true
  previewUrl.value = ''
  await scrollToBottom()

  abortController = new AbortController()
  // 保证「流式全部返回后展示网站」只会触发一次（done 事件与连接关闭二者取先到者）
  let previewShown = false
  const showGeneratedWebsite = () => {
    if (previewShown || hasError) {
      return
    }
    previewShown = true
    refreshPreview()
  }
  await streamSse<string>({
    url: '/app/chat/gen/code',
    params: {
      appId: appId.value,
      prompt,
    },
    abortController,
    onMessage: (event) => {
      // 后端流结束时会发送 event:done，此时代码文件已全部保存
      if (event.event === 'done') {
        // 结束时立即渲染一次，保证最终排版与代码高亮是完整的
        updateAiMessage((target) => flushMarkdown(target))
        showGeneratedWebsite()
        return
      }
      // Vue 工程模式下后端每个数据块是 JSON 消息，按类型分发；其它模式是 {d: '文本'}
      const streamMessage = parseStreamMessage(event.data)
      if (streamMessage) {
        if (streamMessage.type === STREAM_MESSAGE_TYPE.TOOL_EXECUTED) {
          appendToolExecutedMessage(streamMessage.arguments)
        } else if (streamMessage.type === STREAM_MESSAGE_TYPE.TOOL_REQUEST) {
          appendChunk('\n\n> [🔧 选择工具] 写入文件\n\n')
        } else if (streamMessage.type === STREAM_MESSAGE_TYPE.ERROR) {
          // 错误帧与 ai_response 同层，data 即错误原因；标记失败后不再追加后续内容
          markGenerationFailed(streamMessage.data || '生成失败，请重试')
        } else {
          appendChunk(streamMessage.data)
        }
        return
      }
      const payload = event.data as unknown
      const chunk =
        typeof payload === 'string'
          ? payload
          : payload && typeof (payload as { d?: unknown }).d === 'string'
            ? (payload as { d: string }).d
            : ''
      appendChunk(chunk)
    },
    onError: (error) => {
      markGenerationFailed((error as Error)?.message || '生成失败，请重试')
      message.error('生成失败：' + (error as Error)?.message).then(() => {})
    },
    onClose: () => {
      updateAiMessage((target) => {
        if (target.status !== 'error') {
          target.status = 'done'
        }
        flushMarkdown(target)
      })
      generating.value = false
      abortController = null
      // 流式接口全部返回后展示生成的网站
      showGeneratedWebsite()
    },
  })
}

// 发送用户消息
const handleSend = async () => {
  if (!canChat.value) {
    message.warning('无法在别人的作品下对话哦~').then(() => {})
    return
  }
  const prompt = userInput.value.trim()
  if (!prompt || generating.value) {
    return
  }
  sessionMessages.value.push({
    id: createMessageIdGenerator(),
    role: 'user',
    content: prompt,
    html: '',
    status: 'done',
  })
  userInput.value = ''
  await scrollToBottom()
  await genCode(prompt)
}

// 刷新预览：始终指向「本次生成产物」目录（{codeGenType}_{appId}）
const refreshPreview = () => {
  previewUrl.value = buildPreviewUrl()
  previewKey.value += 1
}

const openPreview = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

// 部署应用
const handleDeploy = async () => {
  if (!appId.value) {
    return
  }
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value })
    if (res.data.code === 0 && res.data.data) {
      const url = res.data.data
      try {
        await navigator.clipboard.writeText(url)
        message.success('部署成功，访问地址已复制到剪贴板').then(() => {})
      } catch {
        message.success('部署成功：' + url, 6).then(() => {})
      }
      await fetchApp()
      window.open(url, '_blank')
    } else {
      message.error('部署失败，' + res.data.message).then(() => {})
    }
  } finally {
    deploying.value = false
  }
}

// 修改应用名称
const openRenameModal = () => {
  renameValue.value = app.value.appName ?? ''
  renameModalOpen.value = true
}

const handleRename = async () => {
  const name = renameValue.value.trim()
  if (!name) {
    message.warning('请输入应用名称').then(() => {})
    return
  }
  renaming.value = true
  try {
    const res = await updateApp({ id: appId.value, appName: name })
    if (res.data.code === 0) {
      app.value = { ...app.value, appName: name }
      renameModalOpen.value = false
      message.success('修改成功').then(() => {})
    } else {
      message.error('修改失败，' + res.data.message).then(() => {})
    }
  } finally {
    renaming.value = false
  }
}

const goToEditPage = () => {
  router.push(`/app/edit/${appId.value}`)
}

// 返回首页
const goHome = () => {
  router.push('/')
}

// 应用详情悬浮窗
const openDetailModal = () => {
  detailModalOpen.value = true
}

const handleDetailEdit = () => {
  detailModalOpen.value = false
  goToEditPage()
}

// 删除应用（普通用户接口已校验归属）
const handleDetailDelete = async () => {
  if (!appId.value) {
    return
  }
  deleting.value = true
  try {
    const res = await deleteApp({ id: appId.value })
    if (res.data.code === 0) {
      detailModalOpen.value = false
      message.success('删除成功').then(() => {})
      await router.replace('/')
    } else {
      message.error('删除失败，' + res.data.message).then(() => {})
    }
  } finally {
    deleting.value = false
  }
}

// 进入对话页的初始化：拉取应用详情 -> 加载历史消息 -> 按需自动生成 -> 展示网站
const initPage = async () => {
  await fetchApp()
  await loadHistory()
  await scrollToBottom()
  // 首页创建应用后会带上 prompt 参数，这里只处理一次并清理掉，避免刷新后重复触发
  const prompt = route.query.prompt
  const initPrompt =
    (typeof prompt === 'string' && prompt.trim() ? prompt : app.value.initPrompt) ?? ''
  if (typeof prompt === 'string' && prompt.trim()) {
    await router.replace({ path: route.path })
  }
  // 只有自己的应用、且确已加载过对话历史并确认没有历史时，才把初始提示词作为第一条消息触发对话
  if (isOwner.value && historyLoaded.value && historyTotal.value === 0 && initPrompt.trim()) {
    userInput.value = initPrompt.trim()
    // 走 handleSend 以便把用户消息也展示在对话里
    await handleSend()
    return
  }
  // 已有至少一轮完整对话（用户消息 + AI 消息）时，展示之前生成过的网站
  if (historyTotal.value >= MIN_CHAT_HISTORY_FOR_PREVIEW) {
    refreshPreview()
  }
}

onMounted(initPage)

// 切换到另一个应用时同一路由会复用组件（onMounted 不再触发），需要重新初始化
watch(
  () => route.params.id,
  async (value, oldValue) => {
    if (!value || String(value) === String(oldValue)) {
      return
    }
    clearMarkdownTimers()
    historyMessages.value = []
    sessionMessages.value = []
    historyTotal.value = 0
    historyCursor.value = ''
    hasMoreHistory.value = false
    historyLoaded.value = false
    userInput.value = ''
    previewUrl.value = ''
    await initPage()
  },
)

onBeforeUnmount(() => {
  abortController?.abort()
  clearMarkdownTimers()
})
</script>

<style scoped>
.app-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f8fd;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #edf2fa;
  box-shadow: 0 4px 16px rgb(31 73 125 / 5%);
}

.header-left {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.back-button {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  color: #5c6d86;
  font-size: 16px;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  place-items: center;
  cursor: pointer;
  background: #f7f9fc;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.back-button:hover,
.back-button:focus {
  color: #1677ff;
  border-color: #bfdbfe;
  background: #eef5ff;
  box-shadow: 0 6px 14px rgb(22 119 255 / 14%);
}

.app-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  background: #f4f8ff;
}

.app-avatar img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.app-name-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  max-width: 420px;
  padding: 6px 12px;
  color: #172b4d;
  font-weight: 700;
  font-size: 15px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.app-name-button:hover {
  background: #f5f8fd;
  border-color: #e6eefb;
}

.app-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-name-icon {
  color: #8da0ba;
  font-size: 12px;
}

.header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.detail-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 38px;
  padding: 0 16px;
  color: #48658b;
  font-weight: 600;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  background: #f7f9fc;
  box-shadow: none;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.detail-button:hover,
.detail-button:focus {
  color: #1677ff !important;
  border-color: #bfdbfe !important;
  background: #eef5ff !important;
  box-shadow: 0 6px 14px rgb(22 119 255 / 14%);
}

.deploy-button {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 20px;
  color: #fff;
  font-weight: 600;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 8px 18px rgb(40 96 224 / 24%);
}

.deploy-button:hover,
.deploy-button:focus {
  color: #fff !important;
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
}

.chat-body {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
  padding: 10px 12px 12px;
}

.chat-panel {
  display: flex;
  flex: 2;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf2fa;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.message-list {
  flex: 1;
  padding: 16px 14px 6px;
  overflow-y: auto;
  /* 常驻预留滚动条宽度，内容增减时不会左右抖动 */
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

/* 滚动条：轨道透明、滑块是内缩的圆角胶囊，鼠标移入时渐变为品牌蓝 */
.message-list::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 999px;
}

.message-list::-webkit-scrollbar-thumb {
  /* 透明边框 + padding-box 裁剪，让滑块比轨道更细、更精致 */
  border: 3px solid transparent;
  border-radius: 999px;
  background: linear-gradient(135deg, #dbe6f5, #cadcf0);
  background-clip: padding-box;
}

.message-list:hover::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #c7dbf5, #aec9ea);
  background-clip: padding-box;
}

.message-list::-webkit-scrollbar-thumb:hover,
.message-list::-webkit-scrollbar-thumb:active {
  background: linear-gradient(135deg, #93c2fb, #6ba4ef);
  background-clip: padding-box;
}

.message-list::-webkit-scrollbar-corner {
  background: transparent;
}

/* 不支持 ::-webkit-scrollbar 的浏览器（如 Firefox）用标准属性兜底 */
@supports not selector(::-webkit-scrollbar) {
  .message-list {
    scrollbar-width: thin;
    scrollbar-color: #cadcf0 transparent;
  }
}

.message-empty {
  margin-top: 56px;
}

/* ---- 历史消息加载更多 ---- */
.history-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.load-more-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  color: #48658b;
  font-weight: 600;
  font-size: 13px;
  border: 1px solid #e6eefb;
  border-radius: 999px;
  background: #f7f9fc;
  box-shadow: none;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.load-more-button:hover,
.load-more-button:focus {
  color: #1677ff !important;
  border-color: #bfdbfe !important;
  background: #eef5ff !important;
  box-shadow: 0 6px 14px rgb(22 119 255 / 14%);
}

.history-more-tip {
  color: #8fa4c1;
  font-size: 12px;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message-row.is-user {
  flex-direction: row-reverse;
}

.message-avatar {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 15px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
}

.message-avatar img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.message-bubble {
  max-width: 90%;
  padding: 12px 15px;
  color: #33475f;
  font-size: 14px;
  line-height: 1.75;
  border-radius: 14px;
  background: #f5f8fd;
}

.is-user .message-bubble {
  color: #fff;
  background: linear-gradient(120deg, #1677ff, #5e63f2);
  box-shadow: 0 10px 20px rgb(40 96 224 / 20%);
}

.message-content {
  word-break: break-word;
}

/* 用户消息是纯文本，保留原有换行与空格 */
.message-content.is-plain-text {
  white-space: pre-wrap;
}

/* ---- AI 回复的 Markdown 样式 ----
   v-html 注入的节点不带 scoped 标记，因此统一用 :deep 命中 */
.message-content.markdown-body {
  font-size: 14px;
  line-height: 1.75;
}

.message-content.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.message-content.markdown-body :deep(h1),
.message-content.markdown-body :deep(h2),
.message-content.markdown-body :deep(h3),
.message-content.markdown-body :deep(h4),
.message-content.markdown-body :deep(h5),
.message-content.markdown-body :deep(h6) {
  margin: 16px 0 10px;
  color: #172b4d;
  font-weight: 700;
  line-height: 1.4;
}

.message-content.markdown-body :deep(h1) {
  font-size: 19px;
}

.message-content.markdown-body :deep(h2) {
  font-size: 17px;
}

.message-content.markdown-body :deep(h3) {
  font-size: 15px;
}

.message-content.markdown-body :deep(h4),
.message-content.markdown-body :deep(h5),
.message-content.markdown-body :deep(h6) {
  font-size: 14px;
}

.message-content.markdown-body :deep(ul),
.message-content.markdown-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}

.message-content.markdown-body :deep(li) {
  margin: 4px 0;
}

.message-content.markdown-body :deep(li::marker) {
  color: #7c9cc9;
}

.message-content.markdown-body :deep(blockquote) {
  margin: 10px 0;
  padding: 6px 12px;
  color: #5c6d86;
  border-left: 3px solid #cfe0f8;
  border-radius: 0 8px 8px 0;
  background: #f5f8fd;
}

.message-content.markdown-body :deep(a) {
  color: #1677ff;
  text-decoration: none;
}

.message-content.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.message-content.markdown-body :deep(hr) {
  margin: 14px 0;
  border: 0;
  border-top: 1px dashed #dbe6f5;
}

.message-content.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

/* 行内代码 */
.message-content.markdown-body :deep(code) {
  padding: 2px 6px;
  color: #d6396b;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace;
  font-size: 12.5px;
  border: 1px solid #e6eefb;
  border-radius: 6px;
  background: #f5f8fd;
}

/* 代码块：高亮着色交给 highlight.js 的主题，这里只控制容器 */
.message-content.markdown-body :deep(pre) {
  margin: 10px 0;
  padding: 12px 14px;
  overflow: auto;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  background: #f8fafd;
}

.message-content.markdown-body :deep(pre code) {
  padding: 0;
  color: inherit;
  font-size: 12.5px;
  line-height: 1.7;
  border: 0;
  background: transparent;
}

.message-content.markdown-body :deep(table) {
  width: 100%;
  margin: 10px 0;
  font-size: 13px;
  border-collapse: collapse;
}

.message-content.markdown-body :deep(th),
.message-content.markdown-body :deep(td) {
  padding: 7px 10px;
  border: 1px solid #e6eefb;
}

.message-content.markdown-body :deep(th) {
  color: #48658b;
  font-weight: 600;
  background: #f5f8fd;
}

/* 首尾元素去掉多余外边距，让气泡内边距保持一致 */
.message-content.markdown-body :deep(p:first-child),
.message-content.markdown-body :deep(pre:first-child),
.message-content.markdown-body :deep(ul:first-child),
.message-content.markdown-body :deep(ol:first-child),
.message-content.markdown-body :deep(blockquote:first-child),
.message-content.markdown-body :deep(h1:first-child),
.message-content.markdown-body :deep(h2:first-child),
.message-content.markdown-body :deep(h3:first-child) {
  margin-top: 0;
}

.message-content.markdown-body :deep(p:last-child),
.message-content.markdown-body :deep(pre:last-child),
.message-content.markdown-body :deep(ul:last-child),
.message-content.markdown-body :deep(ol:last-child),
.message-content.markdown-body :deep(blockquote:last-child),
.message-content.markdown-body :deep(table:last-child) {
  margin-bottom: 0;
}

.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a8bcd8;
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* 生成失败提示：后端 error 帧的错误原因，软红底 + 图标，长文案可换行 */
.error-tip {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin-top: 8px;
  padding: 8px 12px;
  color: #cf3b56;
  font-size: 12.5px;
  line-height: 1.7;
  border: 1px solid #ffd8df;
  border-radius: 10px;
  background: #fff6f8;
}

.error-tip :deep(.anticon) {
  flex: 0 0 auto;
  margin-top: 3px;
  color: #f0667c;
}

.error-tip > span {
  min-width: 0;
  word-break: break-word;
}

.input-wrapper {
  padding: 8px 12px 12px;
}

.input-card {
  padding: 12px 14px 10px;
  background: #f7f9fc;
  border: 1px solid #eaf0f9;
  border-radius: 16px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.input-card:focus-within {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 8%);
}

/* 非本人作品：输入区只读 */
.input-card.is-readonly {
  cursor: not-allowed;
  background: #f2f5fa;
  border-color: #e6edf7;
}

.input-card.is-readonly:focus-within {
  background: #f2f5fa;
  border-color: #e6edf7;
  box-shadow: none;
}

.input-card.is-readonly :deep(.ant-input) {
  color: #93a3b8;
  cursor: not-allowed;
}

.input-card.is-readonly .send-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chat-textarea {
  padding: 0;
  font-size: 14px;
  line-height: 1.7;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.chat-textarea :deep(textarea) {
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.chat-textarea :deep(textarea::placeholder) {
  color: #9aa9bf;
}

.input-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
}

.send-button {
  display: grid;
  width: 36px;
  height: 36px;
  color: #fff;
  font-size: 16px;
  border: 0;
  border-radius: 50%;
  place-items: center;
  cursor: pointer;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 8px 16px rgb(54 103 210 / 26%);
  transition: opacity 0.2s ease;
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.preview-panel {
  display: flex;
  flex: 3;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf2fa;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid #eef3fa;
}

.preview-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #48658b;
  font-weight: 600;
  font-size: 14px;
}

.preview-title :deep(.anticon) {
  color: #1677ff;
}

.preview-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preview-icon-button {
  display: grid;
  width: 30px;
  height: 30px;
  color: #6b7b93;
  border: 1px solid #eaf0f9;
  border-radius: 8px;
  place-items: center;
  cursor: pointer;
  background: #f7f9fc;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.preview-icon-button:hover:not(:disabled) {
  color: #1677ff;
  background: #eef5ff;
}

.preview-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.preview-body {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 8px;
  background: #f5f8fd;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #e6eefb;
  border-radius: 10px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 0 40px;
  text-align: center;
}

.placeholder-icon {
  display: grid;
  width: 62px;
  height: 62px;
  color: #7c9cc9;
  font-size: 26px;
  place-items: center;
  border: 1px solid #e6eefb;
  border-radius: 18px;
  background: #fff;
}

.placeholder-title {
  margin: 0;
  color: #3c5677;
  font-weight: 600;
  font-size: 16px;
}

.placeholder-tip {
  max-width: 380px;
  margin: 0;
  color: #8fa4c1;
  font-size: 13px;
  line-height: 1.8;
}

@media (max-width: 1024px) {
  .app-chat-page {
    height: auto;
  }

  .chat-body {
    flex-direction: column;
  }

  .chat-panel {
    flex: none;
    height: 70vh;
  }

  .preview-panel {
    flex: none;
    height: 70vh;
  }
}

@media (max-width: 760px) {
  .chat-header {
    padding: 0 12px;
  }

  .app-name-button {
    max-width: 140px;
  }

  .chat-body {
    padding: 10px;
  }
}

/* —— Markdown 代码块（超长代码行的横向滚动）—— */
.message-content.markdown-body :deep(pre::-webkit-scrollbar) {
  width: 10px;
  height: 10px;
}

.message-content.markdown-body :deep(pre::-webkit-scrollbar-track) {
  background: transparent;
  border-radius: 999px;
}

.message-content.markdown-body :deep(pre::-webkit-scrollbar-thumb) {
  border: 3px solid transparent;
  border-radius: 999px;
  background: linear-gradient(135deg, #dbe6f5, #cadcf0);
  background-clip: padding-box;
}

.message-content.markdown-body :deep(pre:hover::-webkit-scrollbar-thumb) {
  background: linear-gradient(135deg, #c7dbf5, #aec9ea);
  background-clip: padding-box;
}

.message-content.markdown-body :deep(pre::-webkit-scrollbar-thumb:hover),
.message-content.markdown-body :deep(pre::-webkit-scrollbar-thumb:active) {
  background: linear-gradient(135deg, #93c2fb, #6ba4ef);
  background-clip: padding-box;
}

.message-content.markdown-body :deep(pre::-webkit-scrollbar-corner) {
  background: transparent;
}

/* 表格内超长内容优先换行，避免把对话区撑出横向滚动条 */
.message-content.markdown-body :deep(th),
.message-content.markdown-body :deep(td) {
  word-break: break-word;
}

/* 不支持 ::-webkit-scrollbar 的浏览器（如 Firefox）兜底 */
@supports not selector(::-webkit-scrollbar) {
  .message-content.markdown-body :deep(pre) {
    scrollbar-width: thin;
    scrollbar-color: #cadcf0 transparent;
  }
}
</style>
