<template>
  <div class="app-chat-page">
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
          <template #icon>
            <ProfileOutlined />
          </template>
          应用详情
        </a-button>
        <a-tooltip v-if="canChat" title="下载代码">
          <a-button class="download-button" :loading="downloading" @click="handleDownload">
            <template #icon>
              <DownloadOutlined />
            </template>
          </a-button>
        </a-tooltip>
        <!-- 状态取 /app/deploy/status 的 status 字段（老数据后端已按「有 deployKey = 已部署」返回） -->
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
          @click="openDeployConfirm"
        >
          <template #icon>
            <CloudUploadOutlined />
          </template>
          {{ deployButtonText }}
        </a-button>
      </div>
    </header>

    <div class="chat-body">
      <section class="chat-panel">
        <div ref="messageListRef" class="message-list" @scroll="handleMessageListScroll">
          <div v-if="hasMoreHistory" class="history-more">
            <a-button class="load-more-button" :loading="historyLoading" @click="loadMoreHistory">
              <template #icon>
                <HistoryOutlined />
              </template>
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
              <!-- 每条 AI 回复各有一个思考过程（非全页共用）：本轮那条默认展开并实时追加，用户的收起/展开按消息记住并作为后续历史回复的默认值 -->
              <div
                v-if="item.role === 'ai' && item.thinking"
                class="thinking-panel"
                :class="{ 'is-collapsed': isThinkingCollapsed(item) }"
              >
                <button type="button" class="thinking-header" @click="toggleThinking(item)">
                  <BulbOutlined class="thinking-icon" />
                  <span class="thinking-title">AI思考过程</span>
                  <span v-if="isThinkingLive(item)" class="thinking-live">
                    <span class="thinking-live-dot"></span>
                    思考中
                  </span>
                  <span v-else class="thinking-meta">{{ item.thinking.length }} 字</span>
                  <DownOutlined class="thinking-arrow" />
                </button>
                <div
                  v-show="!isThinkingCollapsed(item)"
                  :ref="(el) => setThinkingBodyRef(item.id, el)"
                  class="thinking-body"
                  @scroll="handleThinkingScroll(item)"
                >
                  {{ item.thinking }}
                </div>
              </div>
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

        <div class="input-wrapper">
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
                <!-- 开关可视化编辑：选中元素后发消息，AI 会按该元素修改 -->
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
            <!-- 构建失败：预览区必然空白/404，标题行先给个显眼状态 -->
            <span v-if="previewBuildError" class="preview-error-badge">
              <ExclamationCircleOutlined />
              构建失败
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
          <div v-if="previewBuildError" class="preview-build-error">
            <ExclamationCircleOutlined />
            <div class="preview-build-error-body">
              <p class="preview-build-error-title">网站构建失败，预览暂不可用</p>
              <p class="preview-build-error-detail">{{ previewBuildError }}</p>
              <p class="preview-build-error-tip">
                重新发送一条消息即可触发重新构建；若一直失败，请把上面的原因提供给后端排查。
              </p>
            </div>
          </div>
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

    <AppDetailModal
      v-model:open="detailModalOpen"
      :app="app"
      :deploy-status="deployStatus"
      :can-manage="canChat"
      :deleting="deleting"
      @edit="handleDetailEdit"
      @delete="handleDetailDelete"
    />

    <!-- 部署二次确认：与「应用详情 / 改名」共用 AppModal 外壳，保证弹窗视觉一致 -->
    <AppModal
      v-model:open="deployConfirmOpen"
      title="确认部署该应用？"
      subtitle="部署会执行依赖安装与打包"
      :icon="CloudUploadOutlined"
      :width="460"
      :confirm-loading="deploySubmitting"
      confirm-text="开始部署"
      @confirm="handleDeployConfirm"
    >
      <p class="deploy-confirm-tip">预计需要几十秒。期间可以离开页面，稍后回来查看部署状态。</p>
    </AppModal>

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
import {
  ArrowLeftOutlined,
  BulbOutlined,
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
import { downloadApp, getAppVoById, getGenStatus, updateApp } from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import AppDetailModal from '@/components/AppDetailModal.vue'
import AppModal from '@/components/AppModal.vue'
import DeployStatusTag from '@/components/DeployStatusTag.vue'
import InputHintBar from '@/components/InputHintBar.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useAccess } from '@/composables/useAccess'
import { useAppDeploy } from '@/composables/useAppDeploy'
import { useDeleteApp } from '@/composables/useDeleteApp'
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
  /** 流式输出时节流更新的 Markdown 渲染结果 */
  html: string
  status: 'done' | 'loading' | 'error'
  /** error 帧 data：后端下发的错误原因，展示给用户 */
  errorMessage?: string
  /** 本轮 AI 思考过程（reasoning_content）：只进顶部思考面板、不能混进回复正文；后端单独存 chat_history.thinking */
  thinking?: string
}

const route = useRoute()
const router = useRouter()
const { isAdmin, isOwner } = useAccess()
const { success, error, warning, fail } = useMessage()
/**
 * 生成请求挂在全局 store：页面卸载不中断；刷新/断网回来用 resumeGeneration 按帧序号续订，不丢不重
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
/** 历史消息（已按创建时间升序，旧的在前） */
const historyMessages = ref<ChatMessage[]>([])
const sessionMessages = ref<ChatMessage[]>([])
const messages = computed<ChatMessage[]>(() => [...historyMessages.value, ...sessionMessages.value])
const historyLoading = ref(false)
const historyTotal = ref(0)
/** 游标：已加载历史中最旧一条的创建时间，用于向前加载更早的消息 */
const historyCursor = ref('')
/** 是否还有更早的历史（取满一页说明可能还有） */
const hasMoreHistory = ref(false)
/** 是否成功加载过对话历史（加载失败时不能当成「没有历史」） */
const historyLoaded = ref(false)
const userInput = ref('')
const generating = ref(false)
/** 当前订阅的清理函数：页面卸载只解绑订阅（不中断生成），回到页面重新订阅并从 store 快照恢复 */
let activeGenerationWatch: (() => void) | null = null
const downloading = ref(false)
const previewUrl = ref('')
const previewKey = ref(0)
/** 预览 iframe：可视化编辑脚本注入的目标 */
const previewIframeRef = ref<HTMLIFrameElement | null>(null)
const editMode = ref(false)
const selectedElement = ref<VisualEditorElement | null>(null)
/** 可视化编辑启动失败的原因（展示在标题旁，避免静默失败） */
const editError = ref('')
/** 后端 buildStatus=failed 时的 buildError：dist 没产出，预览必然空白/404，必须把真实原因展示出来 */
const previewBuildError = ref('')
/** 构建失败只 toast 一次，避免轮询期间反复弹 */
let buildErrorNotified = false
const DEFAULT_BUILD_ERROR = 'Vue 工程打包失败，未生成可预览的产物'
const messageListRef = ref<HTMLElement | null>(null)

/** 距底部多少像素内算「贴底」：太小会把轻微上滑误判成离开底部（滚动条被反复抢），太大则用户上翻后仍被拉回 */
const AUTO_SCROLL_THRESHOLD = 80

/** 生成期间是否继续自动贴底：用户上翻即置 false（不再抢滚动条），重新滚到底部恢复 */
const autoScrollEnabled = ref(true)

/** 思考面板收起状态：消息 id -> 是否收起（未记录的按默认值走） */
const thinkingCollapsedMap = ref<Record<string, boolean>>({})
/** 历史回复的思考面板默认收起（一条历史可能有多个 AI 回复，全展开会把对话撑很长）；用户的选择会被记住 */
const defaultThinkingCollapsed = ref(readDefaultThinkingCollapsed())
/** 思考面板是否贴底：消息 id -> 是否贴底（未记录的按贴底处理） */
const thinkingPinnedMap = ref<Record<string, boolean>>({})
/** 思考内容元素：消息 id -> 元素（生成中自动跟随滚动用） */
const thinkingBodyRefs = new Map<string, HTMLElement>()
/** 本轮正在生成的 AI 消息 id：它的思考默认展开并实时更新 */
const generatingMessageId = ref('')

const THINKING_COLLAPSED_KEY = 'dsh:chat:thinking-collapsed'

/** 读默认收起状态；localStorage 不可用（隐私模式等）时按默认收起处理 */
function readDefaultThinkingCollapsed(): boolean {
  try {
    return localStorage.getItem(THINKING_COLLAPSED_KEY) !== '0'
  } catch {
    return true
  }
}

const isThinkingCollapsed = (item: ChatMessage): boolean =>
  thinkingCollapsedMap.value[item.id] ?? defaultThinkingCollapsed.value

/** 是否为本轮正在生成的那条（展示「思考中」并实时跟随） */
const isThinkingLive = (item: ChatMessage): boolean =>
  generating.value && item.id === generatingMessageId.value

/** 容器是否贴底 */
const isNearBottom = (container: HTMLElement) =>
  container.scrollHeight - container.scrollTop - container.clientHeight <= AUTO_SCROLL_THRESHOLD

/** 用户滚动消息列表：按当前位置决定接下来是否继续自动贴底 */
const handleMessageListScroll = () => {
  const container = messageListRef.value
  if (container) {
    autoScrollEnabled.value = isNearBottom(container)
  }
}

/** 流式追加时调用：只有用户本来就在底部才跟着滚，否则保持用户的阅读位置 */
const scrollToBottomIfPinned = () => {
  if (autoScrollEnabled.value) {
    void scrollToBottom()
  }
}

/** v-for 函数式 ref：元素卸载时 Vue 会以 null 调一次，这里同步清掉映射，避免留下脱离文档的元素 */
const setThinkingBodyRef = (messageId: string, element: unknown) => {
  if (element) {
    thinkingBodyRefs.set(messageId, element as HTMLElement)
  } else {
    thinkingBodyRefs.delete(messageId)
  }
}

/** 收起/展开思考面板；选择会记为后续历史回复的默认值 */
const toggleThinking = (item: ChatMessage) => {
  const next = !isThinkingCollapsed(item)
  thinkingCollapsedMap.value[item.id] = next
  defaultThinkingCollapsed.value = next
  try {
    localStorage.setItem(THINKING_COLLAPSED_KEY, next ? '1' : '0')
  } catch {
    // 存不了不影响使用
  }
  if (!next) {
    void nextTick(() => {
      const box = thinkingBodyRefs.get(item.id)
      if (box) {
        box.scrollTop = box.scrollHeight
      }
      thinkingPinnedMap.value[item.id] = true
    })
  }
}

/** 滚动思考面板：用户上翻后该面板不再自动跟随 */
const handleThinkingScroll = (item: ChatMessage) => {
  const box = thinkingBodyRefs.get(item.id)
  if (box) {
    thinkingPinnedMap.value[item.id] = isNearBottom(box)
  }
}

/** 本轮已累积的思考长度（用长度变化触发跟随滚动） */
const liveThinkingLength = computed(() => {
  if (!generating.value || !generatingMessageId.value) {
    return 0
  }
  const current = sessionMessages.value.find((item) => item.id === generatingMessageId.value)
  return current?.thinking?.length ?? 0
})

// 思考实时追加：贴底时跟随滚动，用户上翻查看时保持阅读位置
watch(liveThinkingLength, async () => {
  await nextTick()
  const messageId = generatingMessageId.value
  const box = messageId ? thinkingBodyRefs.get(messageId) : undefined
  const item = sessionMessages.value.find((message) => message.id === messageId)
  if (box && item && !isThinkingCollapsed(item) && (thinkingPinnedMap.value[messageId] ?? true)) {
    box.scrollTop = box.scrollHeight
  }
  // 思考变长会把面板撑高、消息列表变矮，底部随之下移；这里同步跟一次，否则贴底的用户会看不到最新内容
  scrollToBottomIfPinned()
})
const renameModalOpen = ref(false)
const renameValue = ref('')
const renaming = ref(false)
const detailModalOpen = ref(false)
const deployConfirmOpen = ref(false)
const deploySubmitting = ref(false)

/** 与首页卡片共用 useDeleteApp：删完关闭详情弹窗并回首页 */
const { deleting, deleteAppById } = useDeleteApp({
  onDeleted: async () => {
    detailModalOpen.value = false
    await router.replace('/')
  },
})

/**
 * 后端为异步部署（提交毫秒级返回，构建在部署队列里跑）：提交 + 轮询 + 超时保护都在 useAppDeploy 里
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

const isAppOwner = computed(() => isOwner(app.value))

// 只有自己的应用（或管理员）才能在对话页发消息
const canChat = computed(() => isAppOwner.value || isAdmin.value)

let messageIdSeed = 0

/** 脚本注入、编辑状态同步、选中回传都在 utils/visualEditor.ts：页面只关心「是否编辑中」与「选中了哪个元素」 */
const visualEditor = createVisualEditor({
  onSelect: (element) => {
    selectedElement.value = element
  },
  onUnavailable: (reason) => {
    // 不能静默失败：回滚编辑模式，并用提示条 + toast 说明原因
    editMode.value = false
    selectedElement.value = null
    editError.value = describeVisualEditorFailure(reason)
    warning(editError.value)
  },
  onDocumentReady: () => {
    // 预览刷新后旧元素已不存在，清掉避免展示过期信息
    selectedElement.value = null
  },
})

// 选中元素的简短标识（如 button.btn-primary）
const selectedElementLabel = computed(() =>
  selectedElement.value ? formatVisualEditorElement(selectedElement.value) : '',
)

const visualEditTip = computed(() => {
  if (!canChat.value) {
    return '无法在别人的作品下对话哦~'
  }
  if (editMode.value) {
    return '退出可视化编辑'
  }
  return previewUrl.value ? '可视化编辑：点选页面元素进行修改' : '生成网站后可进行可视化编辑'
})

const toggleEditMode = () => {
  if (!previewUrl.value) {
    warning('请先与 AI 对话生成网站，再进行可视化编辑')
    return
  }
  const next = !editMode.value
  editMode.value = next
  // 每次操作先清掉上一次的失败提示（失败时 onUnavailable 会重新写入）
  editError.value = ''
  if (!next) {
    selectedElement.value = null
  }
  visualEditor.setEnabled(next)
}

// 保留编辑模式，方便继续点选其它元素
const clearSelectedElement = () => {
  selectedElement.value = null
  visualEditor.clearSelection()
}

// 退出编辑并复位预览页高亮
const exitEditMode = () => {
  editMode.value = false
  selectedElement.value = null
  editError.value = ''
  visualEditor.setEnabled(false)
}

// iframe 由 v-if + key 渲染，重建后必须重新绑定（attach 内部会注入脚本并同步编辑模式）
watch(previewIframeRef, (iframe) => visualEditor.attach(iframe), { flush: 'post' })

const createMessageIdGenerator = () => {
  messageIdSeed += 1
  return `msg-${Date.now()}-${messageIdSeed}`
}

// 流式分片很密而 Markdown 解析 + 代码高亮有成本：按 100ms 节流重渲染，流结束时立即渲染一次；
// 定时器清理在 useMarkdownThrottle 中，切换应用 / 卸载时调用 clear()
const {
  flush: flushMarkdown,
  schedule: scheduleMarkdown,
  clear: clearMarkdownTimers,
} = useMarkdownThrottle(renderMarkdown)

// 预览地址：{VITE_APP_PREVIEW_BASE_URL}/{codeGenType}_{appId}/（codeGenType 如 multi_file / html，见 utils/apiUrl.ts）
const buildPreviewUrl = () => {
  return getStaticUrl(app.value.codeGenType, appId.value)
}

const scrollToBottom = async () => {
  await nextTick()
  // 主动滚到底部时重新开启自动贴底
  autoScrollEnabled.value = true
  const container = messageListRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

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

// 历史中的错误消息（messageType = error）内容即失败原因，按 AI 消息展示
const toChatMessage = (record: API.ChatHistory): ChatMessage => ({
  id: `history-${record.id}`,
  role: record.messageType === CHAT_MESSAGE_TYPE.USER ? 'user' : 'ai',
  content: record.message ?? '',
  html: renderMarkdown(record.message ?? ''),
  status: 'done',
  thinking: record.thinking || undefined,
})

/** 加载对话历史；loadMore=true 时带游标向前加载更早一页，否则加载最新一页 */
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
        // 不传游标查最新一页，传游标只查比该时间更早的消息
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
    // 本页最旧一条的创建时间，作为下次向前加载的游标
    const oldestRecord = sortedRecords[0]
    if (oldestRecord?.createTime) {
      historyCursor.value = oldestRecord.createTime
    }
    hasMoreHistory.value = records.length >= CHAT_HISTORY_PAGE_SIZE
    historyMessages.value = loadMore ? [...pageMessages, ...historyMessages.value] : pageMessages
  } finally {
    historyLoading.value = false
  }
}

// 加载更多历史：加载后保持当前阅读位置不跳动
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

/** 按 id 定位消息并更新（消息已被移除时什么都不做） */
const createMessageUpdater = (messageId: string) => (updater: (target: ChatMessage) => void) => {
  const target = sessionMessages.value.find((item) => item.id === messageId)
  if (target) {
    updater(target)
  }
}

/** 比对时忽略空白：服务端落库会 trim，前端快照可能带首尾空白 */
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
/** 轮询上限：避免构建异常时页面一直转 */
const PREVIEW_BUILD_POLL_MAX_ATTEMPTS = 80

/** 预览刷新轮询定时器：切换应用 / 卸载时必须停掉 */
let previewRefreshTimer: number | undefined
/** 轮询代数：新一轮生成开始时让上一次的轮询自然失效 */
let previewRefreshToken = 0

const stopPreviewRefreshPolling = () => {
  previewRefreshToken += 1
  if (previewRefreshTimer !== undefined) {
    window.clearTimeout(previewRefreshTimer)
    previewRefreshTimer = undefined
  }
}

/** 生成产出后的预览刷新编排；attempt 为已轮询次数（内部递归用） */
const refreshPreviewAfterGeneration = (attempt = 0) => {
  // 静态模式（HTML / 多文件）：产物在生成结束时已落盘，直接刷新
  if (app.value.codeGenType !== CODE_GEN_TYPE.VUE_PROJECT) {
    refreshPreview()
    return
  }
  const token = previewRefreshToken
  const targetAppId = appId.value
  void (async () => {
    let buildStatus = ''
    let buildError = ''
    // 服务端已无该应用的生成任务（后端重启清空注册表 / 本轮早已结束）
    let noTask = false
    try {
      const res = await getGenStatus({ appId: targetAppId })
      buildStatus = res.data?.data?.buildStatus ?? ''
      buildError = res.data?.data?.buildError ?? ''
      noTask = res.data?.data?.status === 'none'
    } catch {
      // 状态接口偶发失败不应阻塞预览：按「尚未完成」处理，下一轮继续查
      buildStatus = ''
    }
    // 轮询期间切换了应用或又发起一轮生成：放弃本次刷新
    if (token !== previewRefreshToken || targetAppId !== appId.value) {
      return
    }
    if (buildStatus === BUILD_STATUS.FAILED) {
      previewBuildError.value = buildError || DEFAULT_BUILD_ERROR
      if (!buildErrorNotified) {
        buildErrorNotified = true
        error(`构建失败：${previewBuildError.value}`)
      }
      // failed 也刷新：让用户看到当前产物或 404 提示，而不是永远停在旧页
      refreshPreview()
      return
    }
    // 无任务 = 没有东西在构建，等待毫无意义：直接刷新，否则会空轮询到上限（实测后端 SQL 刷屏而预览一直空白）
    if (noTask) {
      // 无任务又非 finished：这一轮构建没成功，预览同样空白，同样要给出解释而非静默刷新
      if (buildStatus !== BUILD_STATUS.FINISHED) {
        previewBuildError.value = DEFAULT_BUILD_ERROR
        if (!buildErrorNotified) {
          buildErrorNotified = true
          error(`构建失败：${previewBuildError.value}`)
        }
      }
      refreshPreview()
      return
    }
    if (buildStatus === BUILD_STATUS.FINISHED) {
      previewBuildError.value = ''
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

/** 生成结束统一入口：先停掉上一轮轮询，再按需等待后端构建 */
const schedulePreviewRefresh = () => {
  stopPreviewRefreshPolling()
  refreshPreviewAfterGeneration()
}

/** 生成结束收尾：刷新预览 + 重新读取部署状态 */
const afterGenerationFinished = () => {
  schedulePreviewRefresh()
  void syncDeployStatus()
}

/**
 * 订阅一轮生成会话，把累积内容与终态同步到页面上的一条 AI 消息；返回解绑函数。
 * session 必须是当时 store 里的当前会话
 */
const watchGenerationSession = (
  session: GenerationSession,
  messageId: string,
  hooks: { onFinished?: () => void } = {},
) => {
  const targetAppId = appId.value
  const updateAiMessage = createMessageUpdater(messageId)
  // 已同步内容：用前缀比对而非长度比对，避免「长度变小」导致整体清空
  let syncedContent = ''
  // 已同步的思考过程（同样按前缀推进）
  let syncedThinking = ''
  let errorNotified = false
  // 已解绑：避免终态回调重复触发预览刷新
  let detached = false
  const stopWatch = watch(
    // 正文与思考都要参与触发：只盯正文会漏掉「模型这一轮只在思考」的增量
    () => `${session.content.length}:${session.thinking.length}:${session.status}`,
    () => {
      // 会话已被新一轮替换/清理：本轮订阅立即失效，不再触碰任何消息
      if (detached || getCurrentSession(targetAppId) !== session) {
        detached = true
        stopWatch()
        return
      }
      // 思考过程单独同步，只进顶部面板、不进正文
      const thinking = session.thinking
      if (thinking.length > syncedThinking.length) {
        syncedThinking = thinking
        updateAiMessage((target) => {
          target.thinking = thinking
        })
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
        scrollToBottomIfPinned()
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
          hooks.onFinished?.()
        }
        return
      }
      updateAiMessage((target) => (finished ? flushMarkdown(target) : scheduleMarkdown(target)))
    },
    { immediate: true },
  )
  if (session.content) {
    syncedContent = session.content
    updateAiMessage((target) => {
      target.content = session.content
      flushMarkdown(target)
    })
  }
  // 续订/恢复时把已积累的思考补上，避免刷新回来面板是空的
  if (session.thinking) {
    syncedThinking = session.thinking
    updateAiMessage((target) => {
      target.thinking = session.thinking
    })
  }
  return () => {
    detached = true
    stopWatch()
  }
}

// 调用 SSE 接口生成代码
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
  // 本轮思考默认展开，并记为「正在生成」的那条
  generatingMessageId.value = aiMessageId
  thinkingCollapsedMap.value[aiMessageId] = false
  previewUrl.value = ''
  // 清掉上一轮的构建失败提示，避免残留误导
  previewBuildError.value = ''
  buildErrorNotified = false
  await scrollToBottom()

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
 * 会话内容是否已完整落在历史里：生成结束后服务端会写入历史，刷新时可能已能查到，
 * 此时再插一条「会话恢复」消息就会出现两条相同回复
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
 * 从全局会话恢复这一轮 AI 消息（整页刷新 / 浏览器返回）：会话持久化在 sessionStorage + 帧序号，
 * 历史接口里可能还没有它；若这一轮仍在服务端跑，用 /app/chat/gen/resume?fromSeq= 接回订阅，
 * 服务端补发缺失帧后继续推送，不丢也不重
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
  // 已完成且历史里已落库：交给历史渲染，避免重复展示同一轮回复
  if (!resuming && current.status === 'done' && isContentAlreadyInHistory(current.content)) {
    return false
  }
  // 恢复的消息挂在 sessionMessages（历史之后），按会话内容整体重建
  const messageId = createMessageIdGenerator()
  sessionMessages.value.push({
    id: messageId,
    role: 'ai',
    content: current.content,
    html: renderMarkdown(current.content),
    status: resuming || current.status === 'running' ? 'loading' : 'done',
    errorMessage: current.errorMessage || undefined,
    thinking: current.thinking || undefined,
  })
  generating.value = resuming || current.status === 'running'
  if (generating.value) {
    // 仍在生成：思考默认展开并实时跟随
    generatingMessageId.value = messageId
    thinkingCollapsedMap.value[messageId] = false
  }
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

const handleSend = async () => {
  if (!canChat.value) {
    warning('无法在别人的作品下对话哦~')
    return
  }
  const prompt = userInput.value.trim()
  if (!prompt || generating.value) {
    return
  }
  // 选中元素时把元素信息拼进提示词，AI 才知道要改页面上的哪一块
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
  // 发送后退出编辑模式（预览页高亮由 exitEditMode 一并复位）
  exitEditMode()
  await scrollToBottom()
  await genCode(finalPrompt)
}

// 回车发送、Shift+回车换行、输入法组合期间不发送（与首页同一套规则）
const { handlePressEnter } = useEnterSubmit(handleSend)

// 预览地址始终指向本次生成产物目录；用户主动刷新时先停掉自动轮询，避免互相打断
const refreshPreview = () => {
  stopPreviewRefreshPolling()
  // 重新加载常能修好「脚本没注入」，先清掉上次的失败提示
  editError.value = ''
  previewUrl.value = buildPreviewUrl()
  previewKey.value += 1
}

const openPreview = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

/** 打开部署二次确认（部署会真的装依赖与打包，不能点一下就直接提交） */
const openDeployConfirm = () => {
  if (!appId.value || deploying.value) {
    return
  }
  deployConfirmOpen.value = true
}

/** 确认部署：提交异步部署（毫秒级返回），随后由 useAppDeploy 轮询到 ready / failed */
const handleDeployConfirm = async () => {
  deploySubmitting.value = true
  try {
    await startDeploy()
    deployConfirmOpen.value = false
  } catch (cause) {
    // 队列已满（code=50000）等业务错误：优先展示后端下发的 message
    showError(resolveDeployErrorMessage(cause))
  } finally {
    deploySubmitting.value = false
  }
}

// 部署完成后刷新应用信息：deployKey / deployedTime 由后端在构建成功时写入
watch(deployStatusValue, (value) => {
  if (value === DEPLOY_STATUS.READY) {
    void fetchApp()
  }
})

// 下载应用代码：后端向响应流写 zip 包，文件名走响应头
const handleDownload = async () => {
  if (!appId.value) {
    return
  }
  downloading.value = true
  try {
    // 下载方法不支持 responseType，这里用 options 覆盖成 blob 二进制接收；
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

const goHome = () => {
  router.push('/')
}

const openDetailModal = () => {
  detailModalOpen.value = true
}

const handleDetailEdit = () => {
  detailModalOpen.value = false
  goToEditPage()
}

const handleDetailDelete = () => deleteAppById(appId.value)

// 初始化：应用详情 → 加载历史 → 按需自动生成 → 展示网站
const initPage = async () => {
  await fetchApp()
  // 刷新页面 / 重新进入详情后恢复部署进度：仍在排队或构建中会自动继续轮询
  void syncDeployStatus()
  await loadHistory()
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
    // 停掉上一个应用的预览轮询，避免刷新到已切走的应用
    stopPreviewRefreshPolling()
    // 停掉部署轮询，避免状态串到新应用
    stopDeployPolling()
    historyMessages.value = []
    sessionMessages.value = []
    historyTotal.value = 0
    historyCursor.value = ''
    hasMoreHistory.value = false
    historyLoaded.value = false
    userInput.value = ''
    previewUrl.value = ''
    // 退出可视化编辑，避免上一个应用的选中元素被带到新应用
    exitEditMode()
    await initPage()
  },
)

onBeforeUnmount(() => {
  // 注意：不中断生成请求——返回/关闭页面后生成会在 store 里跑完（服务端同一轮也继续），
  // 回到页面重新订阅即可拿到完整内容；只有切换应用才真正中断（见上面的路由 watch）
  activeGenerationWatch?.()
  activeGenerationWatch = null
  clearMarkdownTimers()
  // 停止预览刷新轮询与部署轮询，避免离开页面后定时器继续请求
  stopPreviewRefreshPolling()
  stopDeployPolling()
  // 释放 iframe 消息监听并复位预览页高亮
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

/* 部署确认弹窗的正文：弹窗内容由本页渲染，因此走页面 scoped 样式 */
.deploy-confirm-tip {
  margin: 0;
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
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

/* ---- AI 思考过程 ---- */
.thinking-panel {
  margin: 0 0 12px;
  /* 比消息气泡底色略深，便于一眼区分出「AI 回复内部的一块」 */
  background: linear-gradient(135deg, #e9f1ff, #f3eeff);
  border: 1px solid #dde7fb;
  border-radius: 10px;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  color: #48658b;
  font-size: 13px;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.thinking-icon {
  color: #1677ff;
  font-size: 14px;
}

.thinking-title {
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* 生成中：圆点 + 文字，明确「思考还在继续」 */
.thinking-live {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: #1677ff;
  font-size: 12px;
}

.thinking-live-dot {
  width: 6px;
  height: 6px;
  background: #1677ff;
  border-radius: 50%;
  animation: thinking-pulse 1.2s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.thinking-meta {
  color: #9aa9bf;
  font-size: 12px;
}

.thinking-arrow {
  margin-left: auto;
  color: #9db4d4;
  font-size: 11px;
  transition: transform 0.2s ease;
}

.thinking-panel.is-collapsed .thinking-arrow {
  /* 收起时箭头指向右侧，表示"可以展开" */
  transform: rotate(-90deg);
}

.thinking-body {
  max-height: 160px;
  padding: 0 12px 10px;
  overflow-y: auto;
  color: #5b6b85;
  font-size: 12.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  overscroll-behavior: contain;
}

/* 矮屏（小笔记本 / 分屏）：思考面板让位给消息列表，避免只看到一块思考内容 */
@media (max-height: 760px) {
  .thinking-body {
    max-height: 108px;
  }
}

.thinking-body::-webkit-scrollbar {
  width: 8px;
}

.thinking-body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: linear-gradient(135deg, #dbe6f5, #cadcf0);
  background-clip: padding-box;
}

.message-list::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 999px;
}

.message-list::-webkit-scrollbar-thumb {
  /* 透明边框 + padding-box 裁剪，让滑块比轨道更细 */
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

@supports not selector(::-webkit-scrollbar) {
  .message-list {
    scrollbar-width: thin;
    scrollbar-color: #cadcf0 transparent;
  }
}

.message-empty {
  margin-top: 56px;
}

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

.message-content.is-plain-text {
  white-space: pre-wrap;
}

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

.message-content.markdown-body :deep(code) {
  padding: 2px 6px;
  color: #d6396b;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace;
  font-size: 12.5px;
  border: 1px solid #e6eefb;
  border-radius: 6px;
  background: #f5f8fd;
}

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

/* 构建失败提示条：贴预览区顶部，不遮挡可能存在的旧产物 */
.preview-build-error {
  position: absolute;
  top: 16px;
  right: 16px;
  left: 16px;
  z-index: 3;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  color: #cf3b56;
  border: 1px solid #ffd8df;
  border-radius: 10px;
  background: rgb(255 246 248 / 96%);
  box-shadow: 0 6px 18px rgb(207 59 86 / 12%);
}

.preview-build-error :deep(.anticon) {
  margin-top: 2px;
  color: inherit;
  font-size: 16px;
}

.preview-build-error-body {
  min-width: 0;
}

.preview-build-error-title {
  margin: 0;
  color: #cf3b56;
  font-weight: 600;
  font-size: 13px;
}

.preview-build-error-detail {
  max-height: 96px;
  margin: 4px 0 0;
  overflow-y: auto;
  color: #8a4a58;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.preview-build-error-tip {
  margin: 4px 0 0;
  color: #a3737f;
  font-size: 12px;
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

.message-content.markdown-body :deep(th),
.message-content.markdown-body :deep(td) {
  word-break: break-word;
}

@supports not selector(::-webkit-scrollbar) {
  .message-content.markdown-body :deep(pre) {
    scrollbar-width: thin;
    scrollbar-color: #cadcf0 transparent;
  }
}
</style>
