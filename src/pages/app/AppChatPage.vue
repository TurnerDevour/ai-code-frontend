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
        <a-tooltip v-if="canChat" title="下载代码">
          <a-button class="download-button" :loading="downloading" @click="handleDownload">
            <template #icon><DownloadOutlined /></template>
          </a-button>
        </a-tooltip>
        <!-- 部署状态：以 /app/deploy/status 的 status 字段为准（老数据后端已按「有 deployKey = 已部署」返回） -->
        <a-tooltip v-if="canChat" :title="deployStatusTip">
          <DeployStatusTag
            :status="deployStatusValue"
            :queue-position="deployStatus?.queuePosition"
            :deploy-url="deployUrl"
            :stale="deployStale"
          />
        </a-tooltip>
        <a-button
          v-if="canChat"
          class="deploy-button"
          :loading="deploying"
          :disabled="deployDisabled"
          @click="handleDeploy"
        >
          <template #icon><CloudUploadOutlined /></template>
          {{ deployButtonText }}
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
          <!-- 可视化编辑：展示预览中选中的元素信息，可点击「移除」主动清除 -->
          <a-alert
            v-if="selectedElement"
            class="selected-element-alert"
            type="info"
            show-icon
            closable
            close-text="移除"
            @close="clearSelectedElement"
          >
            <template #message>
              <span class="element-alert-label">已选中页面元素</span>
              <span class="element-alert-tag">{{ selectedElementLabel }}</span>
            </template>
            <template #description>
              <div class="element-alert-line">
                <span class="element-alert-key">选择器</span>
                <code class="element-alert-code">{{ selectedElement.selector || '-' }}</code>
              </div>
              <div v-if="selectedElement.text" class="element-alert-line">
                <span class="element-alert-key">文本</span>
                <span class="element-alert-text">{{ selectedElement.text }}</span>
              </div>
            </template>
          </a-alert>
          <a-tooltip :title="canChat ? '' : '无法在别人的作品下对话哦~'">
            <div class="input-card" :class="{ 'is-readonly': !canChat }">
              <a-textarea
                v-model:value="userInput"
                class="chat-textarea"
                :rows="3"
                :maxlength="CHAT_INPUT_MAX_LENGTH"
                :disabled="generating || !canChat"
                :placeholder="
                  canChat
                    ? '请描述你想生成的网站，越详细效果越好哦'
                    : '这是别人的作品，无法在此对话'
                "
                @press-enter="handlePressEnter"
              />
              <div class="input-toolbar">
                <InputHintBar
                  :length="userInput.length"
                  :maxlength="CHAT_INPUT_MAX_LENGTH"
                  :show-hint="canChat"
                />
                <!-- 可视化编辑：开关编辑模式，选中元素后发送消息即可让 AI 按元素修改 -->
                <a-tooltip :title="visualEditTip">
                  <button
                    type="button"
                    class="visual-edit-button"
                    :class="{ 'is-active': editMode }"
                    :disabled="!canChat || generating"
                    @click="toggleEditMode"
                  >
                    <HighlightOutlined />
                  </button>
                </a-tooltip>
                <SubmitButton
                  size="sm"
                  :loading="generating"
                  :disabled="generating || !canChat || !userInput.trim()"
                  @click="handleSend"
                />
              </div>
            </div>
          </a-tooltip>
        </div>
      </section>

      <!-- 右侧网页展示区域 -->
      <section class="preview-panel" :class="{ 'is-editing': editMode }">
        <div class="preview-header">
          <div class="preview-title">
            <EyeOutlined />
            <span>生成后的网页展示</span>
            <span v-if="editMode" class="preview-editing-badge">
              <HighlightOutlined />
              编辑中：点击元素即可选中
            </span>
            <span v-else-if="editError" class="preview-error-badge">
              <ExclamationCircleOutlined />
              {{ editError }}
            </span>
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
            ref="previewIframeRef"
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
      :deploy-status="deployStatus"
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
import { Modal } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DesktopOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  EyeOutlined,
  HighlightOutlined,
  HistoryOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { deleteApp, downloadApp, getAppVoById, getGenStatus, updateApp } from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import AppDetailModal from '@/components/AppDetailModal.vue'
import AppModal from '@/components/AppModal.vue'
import DeployStatusTag from '@/components/DeployStatusTag.vue'
import InputHintBar from '@/components/InputHintBar.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useAccess } from '@/composables/useAccess'
import { useAppDeploy } from '@/composables/useAppDeploy'
import { useEnterSubmit } from '@/composables/useEnterSubmit'
import { useMarkdownThrottle } from '@/composables/useMarkdownThrottle'
import { useMessage, showError } from '@/composables/useMessage'
import { getStaticUrl } from '@/utils/apiUrl'
import { resolveDeployErrorMessage } from '@/utils/deploy'
import {
  parseDownloadFileName,
  parseResponseErrorMessage,
  saveBlobAsFile,
} from '@/utils/fileDownload'
import { renderMarkdown } from '@/utils/markdown'
import { useGenerationStore, type GenerationSession } from '@/stores/useGenerationStore'
import { STREAM_MESSAGE_TYPE, parseStreamMessage, parseToolArguments } from '@/utils/streamMessage'
import { parseTime } from '@/utils/time'
import {
  buildVisualEditPrompt,
  createVisualEditor,
  describeVisualEditorFailure,
  formatVisualEditorElement,
} from '@/utils/visualEditor'
import type { VisualEditorElement } from '@/utils/visualEditor'
import {
  CHAT_HISTORY_PAGE_SIZE,
  CHAT_INPUT_MAX_LENGTH,
  CHAT_MESSAGE_TYPE,
  MIN_CHAT_HISTORY_FOR_PREVIEW,
} from '@/constant/chat'
import { CODE_GEN_TYPE } from '@/constant/codeGenType'
import { DEPLOY_STATUS } from '@/constant/deploy'

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
const { isAdmin, isOwner } = useAccess()
const { success, error, warning, fail } = useMessage()
/**
 * 生成会话 store：生成请求挂在这里，页面卸载不会中断它
 * （用户点返回后生成继续跑完；刷新/断网回来时用 resumeGeneration 按帧序号续订，零丢失零重复）
 */
const {
  isGenerating,
  getSession: getGenerationSession,
  getCurrentSession,
  startGeneration,
  resumeGeneration,
  abortGeneration,
} = useGenerationStore()

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
/**
 * 当前页面正在关注的生成会话订阅清理函数
 * <p>
 * 生成请求本身挂全局 store，页面卸载只解除这个订阅（不中断生成），
 * 用户回到页面时会重新订阅并从 store 快照恢复内容。
 */
let activeGenerationWatch: (() => void) | null = null
/** 应用代码打包下载中 */
const downloading = ref(false)
const previewUrl = ref('')
const previewKey = ref(0)
/** 预览 iframe：可视化编辑脚本注入的目标 */
const previewIframeRef = ref<HTMLIFrameElement | null>(null)
/** 是否处于可视化编辑模式 */
const editMode = ref(false)
/** 预览中选中的页面元素：发送消息或手动移除后清空 */
const selectedElement = ref<VisualEditorElement | null>(null)
/** 可视化编辑开不起来时的原因（展示在预览面板标题旁，避免静默失败） */
const editError = ref('')
const messageListRef = ref<HTMLElement | null>(null)
const renameModalOpen = ref(false)
const renameValue = ref('')
const renaming = ref(false)
const detailModalOpen = ref(false)
const deleting = ref(false)

/**
 * 部署状态与轮询
 * 后端已改为异步部署（提交毫秒级返回，构建在部署队列里跑），提交 + 轮询 + 超时保护
 * 都收敛在 useAppDeploy 中，页面只负责展示状态与触发交互
 */
const {
  deployStatus,
  deployStatusValue,
  deploying,
  deployUrl,
  statusTip: deployStatusTip,
  stale: deployStale,
  disabled: deployDisabled,
  buttonText: deployButtonText,
  deploy: startDeploy,
  syncStatus: syncDeployStatus,
  stop: stopDeployPolling,
} = useAppDeploy(appId)

// 是否为当前用户自己的应用（管理员也视为可管理）
const isAppOwner = computed(() => isOwner(app.value))

// 只有自己的应用（或管理员）才能在对话页发消息
const canChat = computed(() => isAppOwner.value || isAdmin.value)

let messageIdSeed = 0

/**
 * 可视化编辑器：脚本注入、编辑状态同步、选中元素回传都封装在 utils/visualEditor.ts 中，
 * 页面只关心「是否编辑中」与「选中了哪个元素」
 */
const visualEditor = createVisualEditor({
  onSelect: (element) => {
    selectedElement.value = element
  },
  onUnavailable: (reason) => {
    // 开不起来时不能静默：回滚编辑模式，并把具体原因同时用提示条与 toast 告诉用户
    editMode.value = false
    selectedElement.value = null
    editError.value = describeVisualEditorFailure(reason)
    warning(editError.value)
  },
  onDocumentReady: () => {
    // 预览刷新后旧元素已不存在，清掉避免展示过期的元素信息
    selectedElement.value = null
  },
})

// 选中元素的简短标识（如 button.btn-primary），展示在提示条标题行
const selectedElementLabel = computed(() =>
  selectedElement.value ? formatVisualEditorElement(selectedElement.value) : '',
)

// 可视化编辑按钮的悬浮提示
const visualEditTip = computed(() => {
  if (!canChat.value) {
    return '无法在别人的作品下对话哦~'
  }
  if (editMode.value) {
    return '退出可视化编辑'
  }
  return previewUrl.value ? '可视化编辑：点选页面元素进行修改' : '生成网站后可进行可视化编辑'
})

// 切换可视化编辑模式
const toggleEditMode = () => {
  if (!previewUrl.value) {
    warning('请先与 AI 对话生成网站，再进行可视化编辑')
    return
  }
  const next = !editMode.value
  editMode.value = next
  // 每次操作先清掉上一次的失败提示（失败时 onUnavailable 会重新写入）
  editError.value = ''
  // 退出编辑模式时选中元素一并失效
  if (!next) {
    selectedElement.value = null
  }
  visualEditor.setEnabled(next)
}

// 移除选中的元素：保留编辑模式，方便继续点选其它元素
const clearSelectedElement = () => {
  selectedElement.value = null
  visualEditor.clearSelection()
}

// 退出可视化编辑并复位预览页中的高亮（发送消息、切换应用时调用）
const exitEditMode = () => {
  editMode.value = false
  selectedElement.value = null
  editError.value = ''
  visualEditor.setEnabled(false)
}

// 预览 iframe 由 v-if + key 渲染，重建后需要重新绑定：绑定内部会自动注入脚本并同步编辑模式
watch(previewIframeRef, (iframe) => visualEditor.attach(iframe), { flush: 'post' })

const createMessageIdGenerator = () => {
  messageIdSeed += 1
  return `msg-${Date.now()}-${messageIdSeed}`
}

// 流式输出的分片很密，而 Markdown 解析 + 代码高亮都有成本：
// 这里按 100ms 节流重渲染，流结束时再立即渲染一次，兼顾实时展示与流畅度。
// 节流与定时器清理都收在 useMarkdownThrottle 中，切换应用 / 卸载时调用 clear()
const {
  flush: flushMarkdown,
  schedule: scheduleMarkdown,
  clear: clearMarkdownTimers,
} = useMarkdownThrottle(renderMarkdown)

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
    fail('获取应用信息失败', res.data)
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
      fail('获取对话历史失败', res.data)
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

/**
 * 按 id 定位页面上的某条消息，保证流式追加时响应式更新
 *
 * @param messageId 消息 id
 *
 * @returns 更新函数（消息已被移除时什么都不做）
 */
const createMessageUpdater = (messageId: string) => (updater: (target: ChatMessage) => void) => {
  const target = sessionMessages.value.find((item) => item.id === messageId)
  if (target) {
    updater(target)
  }
}

/** 比较内容时忽略空白差异：服务端落库时会 trim，前端快照可能带首尾空白 */
const normalizeForCompare = (text: string) => text.replace(/\s+/g, '')

/** 构建状态取值（与后端 GenerationStatusVO.buildStatus 一致） */
const BUILD_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  FINISHED: 'finished',
  FAILED: 'failed',
} as const
/** 预览刷新轮询间隔：Vue 构建通常 10~60 秒，1.5 秒粒度足够且不打扰后端 */
const PREVIEW_BUILD_POLL_INTERVAL = 1500
/** 轮询上限：超过后不再等待（构建异常时不能让页面一直转） */
const PREVIEW_BUILD_POLL_MAX_ATTEMPTS = 80

/** 预览刷新轮询定时器：切换应用/组件卸载时必须停掉 */
let previewRefreshTimer: number | undefined
/** 轮询代数：新一轮生成开始时让上一次的轮询自然失效 */
let previewRefreshToken = 0

/** 停止预览刷新轮询（切换应用、组件卸载、生成失败时调用） */
const stopPreviewRefreshPolling = () => {
  previewRefreshToken += 1
  if (previewRefreshTimer !== undefined) {
    window.clearTimeout(previewRefreshTimer)
    previewRefreshTimer = undefined
  }
}

/**
 * 生成本轮产出后的预览刷新编排
 *
 * 问题 2 的修复：Vue 工程的 dist 是生成结束后由后端**异步构建**出来的，旧实现收到 done 就
 * 立即刷新 iframe，此时 dist 往往还不存在（首轮）或仍是上一次的构建产物，于是预览区一片空白，
 * 必须用户手动点刷新。这里改成：先查构建状态，未完成就轮询到 finished/failed 再刷新。
 *
 * @param attempt 已轮询次数（内部递归使用）
 */
const refreshPreviewAfterGeneration = (attempt = 0) => {
  // 静态模式（HTML / 多文件）：产物在生成结束时就已落盘，直接刷新
  if (app.value.codeGenType !== CODE_GEN_TYPE.VUE_PROJECT) {
    refreshPreview()
    return
  }
  const token = previewRefreshToken
  const targetAppId = appId.value
  void (async () => {
    let buildStatus = ''
    // 服务端是否已经没有这个应用的生成任务（后端重启后注册表清空、或这一轮早就结束了）
    let noTask = false
    try {
      const res = await getGenStatus({ appId: targetAppId })
      buildStatus = res.data?.data?.buildStatus ?? ''
      noTask = res.data?.data?.status === 'none'
    } catch {
      // 状态接口偶发失败不应阻塞预览：按"尚未完成"处理，下一轮继续查
      buildStatus = ''
    }
    // 轮询期间用户切换了应用或又发起了一轮生成：放弃本次刷新
    if (token !== previewRefreshToken || targetAppId !== appId.value) {
      return
    }
    // 服务端没有任务 = 没有任何东西在构建，等待毫无意义：直接刷新预览。
    // 否则会一直按 PREVIEW_BUILD_POLL_INTERVAL 轮询到上限（实测：后端日志里
    // SELECT user / SELECT app 两条 SQL 持续刷屏，而预览区一直空白）。
    if (noTask) {
      refreshPreview()
      return
    }
    if (buildStatus === BUILD_STATUS.FINISHED || buildStatus === BUILD_STATUS.FAILED) {
      // failed 也刷新：让用户看到当前产物或 404 提示，而不是永远停在旧页
      refreshPreview()
      return
    }
    if (attempt >= PREVIEW_BUILD_POLL_MAX_ATTEMPTS) {
      // 超时兜底：刷新一次，避免预览区一直空白
      refreshPreview()
      return
    }
    previewRefreshTimer = window.setTimeout(
      () => refreshPreviewAfterGeneration(attempt + 1),
      PREVIEW_BUILD_POLL_INTERVAL,
    )
  })()
}

/** 统一的「生成结束后刷新预览」入口：先停掉上一轮轮询，再按需等待后端构建 */
const schedulePreviewRefresh = () => {
  stopPreviewRefreshPolling()
  refreshPreviewAfterGeneration()
}

/**
 * 一轮生成结束后的收尾编排：刷新预览 + 重新读取部署状态
 * <p>
 * 为什么必须重新读部署状态：部署按钮的可用性取决于后端的 {@code deployStale}
 * （"代码改过、线上还是旧内容"）。这个值只在进入页面时取过一次，
 * 于是"先部署 → 再用 AI 改代码"之后，页面里仍然缓存着 {@code deployStale=false}，
 * 按钮会一直是灰的「已部署」，用户根本点不动——就是"改完内容无法二次部署"。
 * 生成结束时后端已经把 edit_time 落库（见 GenerationTaskRegistry#finish 的顺序），
 * 这里同步一次就能把按钮切成「重新部署」。
 */
const afterGenerationFinished = () => {
  schedulePreviewRefresh()
  void syncDeployStatus()
}

/**
 * 订阅某一轮生成会话，把它累积的内容与终态同步到页面上的一条 AI 消息
 *
 * 关键点（本体是问题 1 的修复）：
 *   1. 订阅被钉在「发起时的那个会话对象」上。store 里每一轮生成都会整体替换会话对象，
 *      因此回调里只要发现自己的会话不再是当前会话，就立刻解绑——上一轮的订阅绝不会
 *      再去修改任何消息（旧实现按 content.length 增量同步，第 2 轮把长度重置为 0 时
 *      会被误判成"内容变短"，于是清空第一轮消息、再被第二轮的流灌满）；
 *   2. 同步按「已同步前缀」比对：内容仍以已同步部分开头时只追加差异，
 *      否则（会话被重建/内容被改写）整体重建并立即渲染，不会出现半截内容；
 *   3. 会话进入终态（done/error/stopped）后自动解绑，避免订阅长期挂着；
 *   4. 出错时只提示一次，且不再刷新预览，避免展示半成品。
 *
 * @param session     要订阅的会话对象（必须是当时 store 里的当前会话）
 * @param messageId   同步到哪条 AI 消息
 * @param hooks       onFinished 终态回调（用于刷新预览）
 *
 * @returns 解绑函数
 */
const watchGenerationSession = (
  session: GenerationSession,
  messageId: string,
  hooks: { onFinished?: () => void } = {},
) => {
  const targetAppId = appId.value
  const updateAiMessage = createMessageUpdater(messageId)
  // 已同步进 UI 的内容：用前缀比对代替长度比对，避免"长度变小"引发整体清空
  let syncedContent = ''
  // 出错提示只弹一次
  let errorNotified = false
  // 订阅是否已解绑：避免终态回调重复触发预览刷新
  let detached = false
  const stopWatch = watch(
    () => `${session.content.length}:${session.status}`,
    () => {
      // 会话已被新一轮替换（或被清理）：本轮订阅立即失效，不再触碰任何消息
      if (detached || getCurrentSession(targetAppId) !== session) {
        detached = true
        stopWatch()
        return
      }
      const content = session.content
      const finished = session.status !== 'running'
      if (content && !content.startsWith(syncedContent)) {
        // 内容不是简单追加（例如会话被重建）：整体重建
        syncedContent = content
        updateAiMessage((target) => {
          target.content = content
        })
      } else if (content.length > syncedContent.length) {
        const delta = content.slice(syncedContent.length)
        syncedContent = content
        updateAiMessage((target) => {
          target.content += delta
        })
        scrollToBottom()
      }
      if (session.status === 'error') {
        if (!errorNotified) {
          errorNotified = true
          updateAiMessage((target) => {
            target.status = 'error'
            target.errorMessage = session.errorMessage || '生成失败，请重试'
            flushMarkdown(target)
          })
          error('生成失败：' + (session.errorMessage || '请重试'))
        }
        generating.value = false
        if (!detached) {
          detached = true
          stopWatch()
          // 这一轮失败 ≠ 之前生成的网站不存在：仍然走一次「刷新预览」编排。
          // 服务端已经没有任务时会立刻返回终态（一次请求），不会造成空转轮询；
          // 若确实还有构建在跑，则会等它结束再刷新。否则用户点进应用只能看到空白预览，
          // 必须手动点「刷新预览」才看得到已经做好的网站。
          hooks.onFinished?.()
        }
        return
      }
      if (session.status === 'done' || session.status === 'stopped') {
        generating.value = false
        updateAiMessage((target) => {
          target.status = 'done'
          flushMarkdown(target)
        })
        if (!detached) {
          detached = true
          stopWatch()
          // 本轮产出已就绪：Vue 工程要等后端构建完成再刷新，静态模式立即刷新
          hooks.onFinished?.()
        }
        return
      }
      // 生成中：节流渲染，结束后用终态分支做一次完整渲染
      updateAiMessage((target) => (finished ? flushMarkdown(target) : scheduleMarkdown(target)))
    },
    { immediate: true },
  )
  // 立即把已有快照渲染出来（刷新页面后重新订阅时会用到）
  if (session.content) {
    syncedContent = session.content
    updateAiMessage((target) => {
      target.content = session.content
      flushMarkdown(target)
    })
  }
  return () => {
    detached = true
    stopWatch()
  }
}

// 调用 SSE 接口生成代码
// 生成请求挂在全局 store 上（useGenerationStore）：用户点返回/关闭页面时不会掐断连接，
// 而是保持生成继续、把结果接住；回到页面时从 store 快照恢复已生成的内容。
const genCode = async (prompt: string) => {
  if (!appId.value || isGenerating(appId.value)) {
    return
  }
  const aiMessageId = createMessageIdGenerator()
  sessionMessages.value.push({
    id: aiMessageId,
    role: 'ai',
    content: '',
    html: '',
    status: 'loading',
  })

  generating.value = true
  previewUrl.value = ''
  await scrollToBottom()

  // 先解除上一轮遗留的订阅与预览轮询（它们属于已经结束的那一轮），再发起新一轮生成。
  // 否则「等构建完成再刷新预览」的定时器会把上一轮的产物刷到新一轮的界面上。
  activeGenerationWatch?.()
  activeGenerationWatch = null
  stopPreviewRefreshPolling()
  startGeneration(appId.value, prompt)
  // startGeneration 之后取会话：保证订阅的是本轮的新会话对象
  const session = getCurrentSession(appId.value)
  if (!session) {
    generating.value = false
    return
  }
  activeGenerationWatch = watchGenerationSession(session, aiMessageId, {
    onFinished: () => afterGenerationFinished(),
  })
}

/**
 * 判断某个会话的内容是否已经完整落在对话历史里
 *
 * 生成结束后服务端会把这一轮内容写入对话历史，刷新页面时历史接口可能已经能查到它；
 * 这时若无条件再插一条"会话恢复"消息，就会看到两条一模一样的回复。
 *
 * @param content 会话里累积的内容
 *
 * @returns 历史里是否已有等价的 AI 消息
 */
const isContentAlreadyInHistory = (content: string) => {
  const normalized = normalizeForCompare(content)
  if (!normalized) {
    return false
  }
  return historyMessages.value.some(
    (item) => item.role === 'ai' && normalizeForCompare(item.content) === normalized,
  )
}

/**
 * 从全局生成会话恢复这一轮 AI 消息（整页刷新 / 浏览器返回后的场景）
 * <p>
 * 生成请求挂在 store（并持久化到 sessionStorage + 帧序号），所以刷新后内容还在；
 * 但此时历史接口里可能还没有这条 AI 消息，需要主动把它渲染出来。
 * <p>
 * 另外：如果这一轮生成其实还在服务端跑（会话里记着帧序号），这里会用
 * `/app/chat/gen/resume?fromSeq=` 把订阅接回来，服务端补发缺失的帧后继续实时推送，
 * 因此刷新不会丢掉"离开期间"生成的内容，也不会重复渲染已经看过的部分。
 *
 * @returns 是否恢复出了内容
 */
const recoverSessionMessage = () => {
  const targetAppId = appId.value
  if (!targetAppId) {
    return false
  }
  const session = getGenerationSession(targetAppId)
  if (!session) {
    return false
  }
  const resuming = resumeGeneration(targetAppId)
  const current = getCurrentSession(targetAppId)
  if (!current) {
    return false
  }
  // 已经完成且历史里已落库：交给历史渲染，避免重复展示同一轮回复
  if (!resuming && current.status === 'done' && isContentAlreadyInHistory(current.content)) {
    return false
  }
  // 恢复出的 AI 消息挂在 sessionMessages 里（历史消息之后），并按会话内容整体重建
  const messageId = createMessageIdGenerator()
  sessionMessages.value.push({
    id: messageId,
    role: 'ai',
    content: current.content,
    html: renderMarkdown(current.content),
    status: resuming || current.status === 'running' ? 'loading' : 'done',
    errorMessage: current.errorMessage || undefined,
  })
  generating.value = resuming || current.status === 'running'
  if (resuming) {
    // 续订中：内容会继续在 store 里累积，订阅它继续渲染
    activeGenerationWatch?.()
    activeGenerationWatch = watchGenerationSession(current, messageId, {
      onFinished: () => afterGenerationFinished(),
    })
  } else if (!generating.value) {
    // 已中断/已完成：把产出展示出来，避免用户以为"白等了"
    schedulePreviewRefresh()
  }
  return true
}

// 发送用户消息
const handleSend = async () => {
  if (!canChat.value) {
    warning('无法在别人的作品下对话哦~')
    return
  }
  const prompt = userInput.value.trim()
  if (!prompt || generating.value) {
    return
  }
  // 可视化编辑选中了元素时，把元素信息拼进提示词，AI 才知道要改的是页面上的哪一块
  const element = selectedElement.value
  const finalPrompt = element ? buildVisualEditPrompt(element, prompt) : prompt
  sessionMessages.value.push({
    id: createMessageIdGenerator(),
    role: 'user',
    content: finalPrompt,
    html: '',
    status: 'done',
  })
  userInput.value = ''
  // 发送后清除选中元素并退出编辑模式（预览页中的高亮由 exitEditMode 一并复位）
  exitEditMode()
  await scrollToBottom()
  await genCode(finalPrompt)
}

// 回车发送、Shift + 回车换行、输入法组合期间不发送（与首页输入框共用同一套规则）
const { handlePressEnter } = useEnterSubmit(handleSend)

// 刷新预览：始终指向「本次生成产物」目录（{codeGenType}_{appId}）
// 用户主动刷新时（菜单/按钮）先停掉自动轮询，避免和用户操作互相打断
const refreshPreview = () => {
  stopPreviewRefreshPolling()
  // 重新加载往往能解决「脚本没注入」这类问题，先清掉上一次的失败提示
  editError.value = ''
  previewUrl.value = buildPreviewUrl()
  previewKey.value += 1
}

const openPreview = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

/**
 * 部署应用：提交异步部署（毫秒级返回），再轮询到 ready / failed
 * 部署会真的执行依赖安装与打包，因此点击前先做一次二次确认
 */
const handleDeploy = async () => {
  if (!appId.value || deploying.value) {
    return
  }
  Modal.confirm({
    title: '确认部署该应用？',
    content: '部署会执行依赖安装与打包，预计需要几十秒。期间可以离开页面，稍后回来查看部署状态。',
    okText: '开始部署',
    cancelText: '取消',
    onOk: async () => {
      try {
        await startDeploy()
      } catch (cause) {
        // 队列已满（code=50000）等业务错误：优先展示后端下发的 message
        showError(resolveDeployErrorMessage(cause))
      }
    },
  })
}

// 部署完成后刷新应用信息：deployKey / deployedTime 由后端在构建成功时写入
watch(deployStatusValue, (value) => {
  if (value === DEPLOY_STATUS.READY) {
    void fetchApp()
  }
})

// 下载应用代码：后端直接向响应流写 zip 包，并通过响应头下发文件名
const handleDownload = async () => {
  if (!appId.value) {
    return
  }
  downloading.value = true
  try {
    // src/api 下的下载方法不支持 responseType 参数，这里通过 options 覆盖为 blob 以二进制接收；
    // timeout 置 0：打包大应用可能超过 60s 的默认超时
    const res = await downloadApp({ appId: appId.value }, { responseType: 'blob', timeout: 0 })
    // 后端异常时状态码仍是 200，响应体却是 JSON 格式的 BaseResponse，需要先识别出来
    const errorMessage = await parseResponseErrorMessage(res.data)
    if (errorMessage) {
      error('下载失败，' + errorMessage)
      return
    }
    // 文件名以 Content-Disposition 为准（后端为 {appId}.zip），解析失败时用应用名兜底
    const fileName = parseDownloadFileName(
      res.headers?.['content-disposition'],
      `${app.value.appName || appId.value}.zip`,
    )
    saveBlobAsFile(res.data, fileName)
    success('代码下载成功')
  } catch (error) {
    // 非 2xx 时 axios 抛出异常，错误响应体同样是 Blob，需要解析后展示
    const reason = await parseResponseErrorMessage(
      (error as { response?: { data?: unknown } })?.response?.data,
    )
    showError('下载失败，' + (reason || (error as Error)?.message || '请稍后重试'))
  } finally {
    downloading.value = false
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
    warning('请输入应用名称')
    return
  }
  renaming.value = true
  try {
    const res = await updateApp({ id: appId.value, appName: name })
    if (res.data.code === 0) {
      app.value = { ...app.value, appName: name }
      renameModalOpen.value = false
      success('修改成功')
    } else {
      fail('修改失败', res.data)
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
      success('删除成功')
      await router.replace('/')
    } else {
      fail('删除失败', res.data)
    }
  } finally {
    deleting.value = false
  }
}

// 进入对话页的初始化：拉取应用详情 -> 加载历史消息 -> 按需自动生成 -> 展示网站
const initPage = async () => {
  await fetchApp()
  // 刷新页面 / 重新进入详情后恢复部署进度：仍在排队或构建中会自动继续轮询
  void syncDeployStatus()
  await loadHistory()
  // 整页刷新（含浏览器返回按钮触发的前进/后退）后，历史里可能还没有这一轮 AI 消息
  // （服务端兜底关闭、或消息尚未落库），此时从全局会话恢复已生成的内容
  const recovered = recoverSessionMessage()
  await scrollToBottom()
  // 首页创建应用后会带上 prompt 参数，这里只处理一次并清理掉，避免刷新后重复触发
  const prompt = route.query.prompt
  const initPrompt =
    (typeof prompt === 'string' && prompt.trim() ? prompt : app.value.initPrompt) ?? ''
  if (typeof prompt === 'string' && prompt.trim()) {
    await router.replace({ path: route.path })
  }
  // 会话恢复出了内容说明这一轮已经生成过，不再用初始提示词重复触发
  if (recovered) {
    return
  }
  // 只有自己的应用、且确已加载过对话历史并确认没有历史时，才把初始提示词作为第一条消息触发对话
  if (isAppOwner.value && historyLoaded.value && historyTotal.value === 0 && initPrompt.trim()) {
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
    const previousAppId = String(oldValue ?? '')
    // 上一个应用的生成必须真正中断：它已经不在当前页面上下文里了
    if (previousAppId) {
      abortGeneration(previousAppId)
    }
    activeGenerationWatch?.()
    activeGenerationWatch = null
    clearMarkdownTimers()
    // 上一个应用的预览刷新轮询必须停掉，避免刷新到已经切走的应用
    stopPreviewRefreshPolling()
    // 上一个应用的部署轮询必须停掉，避免状态串到新应用
    stopDeployPolling()
    historyMessages.value = []
    sessionMessages.value = []
    historyTotal.value = 0
    historyCursor.value = ''
    hasMoreHistory.value = false
    historyLoaded.value = false
    userInput.value = ''
    previewUrl.value = ''
    // 切换应用时退出可视化编辑，避免上一个应用的选中元素被带到新应用
    exitEditMode()
    await initPage()
  },
)

onBeforeUnmount(() => {
  // 注意：这里【不】中断生成请求。
  // 用户点返回/关闭页面时，生成会继续在 store 里跑完（服务端同一轮也会继续），
  // 回到页面时重新订阅即可拿到完整内容；只有切换应用才会真正中断（见上面的路由 watch）。
  activeGenerationWatch?.()
  activeGenerationWatch = null
  clearMarkdownTimers()
  // 停止预览刷新轮询与部署轮询，避免离开页面后定时器继续请求
  stopPreviewRefreshPolling()
  stopDeployPolling()
  // 释放 iframe 消息监听，并通知预览页复位高亮
  visualEditor.destroy()
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

/* 下载代码：纯图标按钮，与「应用详情」按钮同一套描边风格 */
.download-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  color: #48658b;
  font-size: 16px;
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

.download-button:hover,
.download-button:focus {
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

/* ---- 可视化编辑：选中元素提示条（输入框上方） ----
   选择器都带上 .input-wrapper 前缀：antd 的组件样式带哈希类名（同为 0,2,0 权重），
   且由 cssinjs 在运行时注入，仅靠类名无法稳定覆盖 */
.input-wrapper .selected-element-alert {
  padding: 9px 14px;
  margin-bottom: 10px;
  border: 1px solid #cfe0f8;
  border-radius: 12px;
  background: linear-gradient(120deg, #f2f7ff, #f7f5ff);
}

.input-wrapper .selected-element-alert :deep(.ant-alert-icon) {
  margin-top: 2px;
  color: #1677ff;
  font-size: 15px;
}

.input-wrapper .selected-element-alert :deep(.ant-alert-message) {
  color: #172b4d;
  font-weight: 600;
  font-size: 13px;
  line-height: 20px;
}

.input-wrapper .selected-element-alert :deep(.ant-alert-description) {
  color: #5c6d86;
  font-size: 12.5px;
  line-height: 1.7;
}

.input-wrapper .selected-element-alert :deep(.ant-alert-close-text) {
  color: #7c9cc9;
  font-size: 12px;
}

.input-wrapper .selected-element-alert :deep(.ant-alert-close-text:hover) {
  color: #1677ff;
}

.element-alert-label {
  margin-right: 8px;
}

/* 选中的元素标识：等宽字体 + 白底描边胶囊，和代码块的视觉语言一致 */
.element-alert-tag {
  padding: 1px 8px;
  color: #1677ff;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace;
  font-size: 12px;
  border: 1px solid #d5e5ff;
  border-radius: 6px;
  background: #fff;
}

.element-alert-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.element-alert-key {
  flex: 0 0 auto;
  color: #8fa4c1;
  font-size: 12px;
}

.element-alert-code {
  padding: 0;
  color: #48658b;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  background: transparent;
  border: 0;
}

.element-alert-text {
  min-width: 0;
  color: #5c6d86;
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

.input-card.is-readonly :deep(.submit-icon-button:disabled) {
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
  gap: 12px;
  margin-top: 8px;
}

/* ---- 可视化编辑按钮：位于发送按钮左侧，开启后转为品牌渐变实心 ----
   字数计数与快捷键提示由 InputHintBar 渲染，发送按钮由 SubmitButton 渲染 */
.visual-edit-button {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  color: #5c6d86;
  font-size: 16px;
  border: 1px solid #e6eefb;
  border-radius: 50%;
  place-items: center;
  cursor: pointer;
  background: #f7f9fc;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.visual-edit-button:hover:not(:disabled),
.visual-edit-button:focus-visible:not(:disabled) {
  color: #1677ff;
  border-color: #bfdbfe;
  background: #eef5ff;
  box-shadow: 0 6px 14px rgb(22 119 255 / 14%);
}

.visual-edit-button.is-active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 8px 16px rgb(54 103 210 / 26%);
}

.visual-edit-button:disabled {
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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

/* 编辑模式：预览面板整体描边高亮，提示当前处于点选状态 */
.preview-panel.is-editing {
  border-color: #bfdbfe;
  box-shadow: 0 12px 36px rgb(22 119 255 / 14%);
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

/* 编辑模式徽标：标题右侧的蓝色胶囊提示 */
.preview-editing-badge {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 2px 10px;
  color: #1677ff;
  font-weight: 600;
  font-size: 12px;
  border: 1px solid #d5e5ff;
  border-radius: 999px;
  background: linear-gradient(105deg, #eef5ff, #f2f0ff);
}

.preview-editing-badge :deep(.anticon) {
  color: inherit;
  font-size: 12px;
}

/* 开启编辑模式失败时的原因提示：常驻在标题旁，不再只靠一闪而过的 toast */
.preview-error-badge {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 2px 10px;
  color: #cf3b56;
  font-weight: 600;
  font-size: 12px;
  border: 1px solid #ffd8df;
  border-radius: 999px;
  background: #fff6f8;
}

.preview-error-badge :deep(.anticon) {
  color: inherit;
  font-size: 12px;
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
