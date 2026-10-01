<template>
  <div class="app-chat-page">
    <!-- 顶部栏：应用名称 + 部署按钮 -->
    <header class="chat-header">
      <div class="header-left">
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
          <a-empty
            v-if="!messages.length && !generating"
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
              <div class="message-content">{{ item.content }}</div>
              <div v-if="item.role === 'ai' && item.status === 'loading'" class="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div v-else-if="item.role === 'ai' && item.status === 'error'" class="error-tip">
                生成失败，请重试
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
                    ? '描述越详细，页面越具体，可以一步一步完善生成效果'
                    : '这是别人的作品，无法在此对话'
                "
              />
              <div class="input-toolbar">
                <div class="toolbar-left">
                  <a-upload
                    :show-upload-list="false"
                    :before-upload="beforeUpload"
                    accept="image/*"
                    :disabled="generating || !canChat"
                  >
                    <button type="button" class="tool-button" :disabled="!canChat">
                      <PaperClipOutlined />
                      上传
                    </button>
                  </a-upload>
                  <button
                    type="button"
                    class="tool-button"
                    :disabled="generating || !canChat"
                    @click="handleOptimize"
                  >
                    <BulbOutlined />
                    优化
                  </button>
                </div>
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
    <AppModal
      v-model:open="detailModalOpen"
      title="应用详情"
      subtitle="查看应用的基础信息"
      :icon="ProfileOutlined"
    >
      <div class="detail-section-title">应用基础信息</div>
      <div class="detail-app">
        <div class="detail-app-cover">
          <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
          <span v-else>{{ (app.appName || '未')[0] }}</span>
        </div>
        <div class="detail-app-meta">
          <div class="detail-app-name" :title="app.appName">
            {{ app.appName || '未命名应用' }}
          </div>
          <div class="detail-app-type">
            <a-tag class="type-tag" :bordered="false">{{ app.codeGenType || '-' }}</a-tag>
            <a-tag v-if="app.priority === GOOD_APP_PRIORITY" class="good-tag" :bordered="false">
              <StarFilled />
              精选
            </a-tag>
          </div>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">创建者</span>
        <div class="detail-creator">
          <a-avatar :size="26" :src="app.user?.userAvatar">
            <template #icon><UserOutlined /></template>
          </a-avatar>
          <span class="creator-name">{{ app.user?.username || '-' }}</span>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">创建时间</span>
        <span class="detail-value">{{ app.createTime || '-' }}</span>
      </div>

      <!-- 操作栏：仅本人或管理员可见 -->
      <template v-if="canChat" #footer>
        <a-button class="app-modal-button detail-edit-button" @click="handleDetailEdit">
          <EditOutlined />
          修改
        </a-button>
        <a-popconfirm
          title="确定要删除该应用吗？删除后不可恢复"
          ok-text="确定"
          cancel-text="取消"
          placement="topRight"
          @confirm="handleDetailDelete"
        >
          <a-button class="app-modal-button detail-delete-button" :loading="deleting">
            <DeleteOutlined />
            删除
          </a-button>
        </a-popconfirm>
      </template>
    </AppModal>

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
  ArrowUpOutlined,
  BulbOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DesktopOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SettingOutlined,
  StarFilled,
  UserOutlined,
} from '@ant-design/icons-vue'
import { deleteApp, deployApp, getAppVoById, updateApp } from '@/api/appController'
import AppModal from '@/components/AppModal.vue'
import { getStaticUrl } from '@/utils/apiUrl'
import { streamSse } from '@/utils/sse'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { ACCESS } from '@/constant/access'
import { GOOD_APP_PRIORITY } from '@/constant/app'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  status: 'done' | 'loading' | 'error'
}

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => String(route.params.id ?? ''))
const app = ref<API.AppVO>({})
const messages = ref<ChatMessage[]>([])
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

// 从卡片「查看对话」进入（?view=1）时只查看，不自动发送消息
const isViewMode = computed(() => route.query.view === '1')

let messageIdSeed = 0
let abortController: AbortController | null = null

const createMessageIdGenerator = () => {
  messageIdSeed += 1
  return `msg-${Date.now()}-${messageIdSeed}`
}

// 生成预览地址：http://localhost:8123/api/static/{codeGenType}_{appId}/
// codeGenType 取自应用详情（app.codeGenType，如 multi_file / html）
const buildPreviewUrl = (target?: API.AppVO) => {
  const codeGenType = target?.codeGenType ?? app.value.codeGenType
  const targetAppId = String(target?.id ?? appId.value)
  return getStaticUrl(codeGenType, targetAppId)
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
    previewUrl.value = buildPreviewUrl(res.data.data)
  } else {
    message.error('获取应用信息失败，' + res.data.message).then(() => {})
  }
}

// 调用 SSE 接口生成代码
const genCode = async (prompt: string) => {
  const aiMessageId = createMessageIdGenerator()
  messages.value.push({
    id: aiMessageId,
    role: 'ai',
    content: '',
    status: 'loading',
  })
  // 通过下标定位消息，保证流式追加时响应式更新
  const updateAiMessage = (updater: (message: ChatMessage) => void) => {
    const target = messages.value.find((item) => item.id === aiMessageId)
    if (target) {
      updater(target)
    }
  }
  generating.value = true
  previewUrl.value = ''
  await scrollToBottom()

  abortController = new AbortController()
  // 保证「流式全部返回后展示网站」只会触发一次（done 事件与连接关闭二者取先到者）
  let previewShown = false
  const showGeneratedWebsite = () => {
    if (previewShown) {
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
        showGeneratedWebsite()
        return
      }
      // 后端每个数据块都包装成了 JSON：{"d":"代码块"}
      const payload = event.data as unknown
      const chunk =
        typeof payload === 'string'
          ? payload
          : payload && typeof (payload as { d?: unknown }).d === 'string'
            ? (payload as { d: string }).d
            : ''
      if (!chunk) {
        return
      }
      updateAiMessage((target) => {
        target.content += chunk
      })
      scrollToBottom()
    },
    onError: (error) => {
      updateAiMessage((target) => {
        target.status = 'error'
      })
      message.error('生成失败：' + (error as Error)?.message).then(() => {})
    },
    onClose: () => {
      updateAiMessage((target) => {
        if (target.status !== 'error') {
          target.status = 'done'
        }
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
  messages.value.push({
    id: createMessageIdGenerator(),
    role: 'user',
    content: prompt,
    status: 'done',
  })
  userInput.value = ''
  await scrollToBottom()
  await genCode(prompt)
}

// 输入框优化：补充细节描述
const handleOptimize = () => {
  const current = userInput.value.trim()
  if (!current) {
    message.warning('请先输入应用描述').then(() => {})
    return
  }
  userInput.value = `${current}\n\n要求：页面结构清晰、视觉精美、支持响应式布局，交互流畅，可直接运行。`
  message.success('已为你补充细节描述').then(() => {})
}

// 上传图片作为参考
const beforeUpload = (file: File) => {
  if (!canChat.value) {
    message.warning('无法在别人的作品下对话哦~').then(() => {})
    return false
  }
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件').then(() => {})
    return false
  }
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result ?? '')
    userInput.value = `${userInput.value}${userInput.value ? '\n' : ''}请参考图片：${result}`
  }
  reader.readAsDataURL(file)
  return false
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

// 进入对话页的初始化：拉取应用详情 -> 按需自动生成 -> 展示预览
const initPage = async () => {
  await fetchApp()
  // 从卡片「查看对话」进入（?view=1）或不是自己的应用时，不自动发送初始提示词
  const prompt = route.query.prompt
  if (!isViewMode.value && canChat.value && typeof prompt === 'string' && prompt.trim()) {
    await router.replace({ path: route.path })
    // 走 handleSend 以便把用户消息也展示在对话里
    userInput.value = prompt.trim()
    await handleSend()
    return
  }
  // 只查看时去掉 prompt 参数，避免刷新后又自动生成
  if (isViewMode.value && route.query.prompt) {
    await router.replace({ path: route.path, query: { view: '1' } })
  }
  // 展示已生成过的产物目录
  refreshPreview()
}

onMounted(initPage)

// 切换到另一个应用时同一路由会复用组件（onMounted 不再触发），需要重新初始化
watch(
  () => route.params.id,
  async (value, oldValue) => {
    if (!value || String(value) === String(oldValue)) {
      return
    }
    messages.value = []
    userInput.value = ''
    previewUrl.value = ''
    await initPage()
  },
)

onBeforeUnmount(() => {
  abortController?.abort()
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
  height: 64px;
  padding: 0 20px;
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

/* 应用详情窗内容（弹窗外壳与按钮样式见 @/components/AppModal.vue，
   内容同样被 teleport 到 body，故使用 :global） */
:global(.app-modal .detail-section-title) {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
  color: #5375a4;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1.4px;
}

:global(.app-modal .detail-section-title::before) {
  display: block;
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1677ff, #6d5dfc);
  content: '';
}

:global(.app-modal .detail-app) {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  margin-bottom: 18px;
  border: 1px solid #eef3fa;
  border-radius: 14px;
  background: #f8fbff;
}

:global(.app-modal .detail-app-cover) {
  display: grid;
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  overflow: hidden;
  color: #fff;
  font-weight: 700;
  font-size: 22px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 8px 18px rgb(54 103 210 / 22%);
}

:global(.app-modal .detail-app-cover img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

:global(.app-modal .detail-app-meta) {
  min-width: 0;
}

:global(.app-modal .detail-app-name) {
  margin-bottom: 6px;
  overflow: hidden;
  color: #172b4d;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.app-modal .detail-app-type) {
  display: flex;
  gap: 6px;
  align-items: center;
}

:global(.app-modal .type-tag) {
  padding: 1px 9px;
  color: #1677ff;
  font-weight: 600;
  font-size: 12px;
  border: 0;
  border-radius: 999px;
  background: #eaf3ff;
}

:global(.app-modal .good-tag) {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 1px 9px;
  color: #b45309;
  font-weight: 600;
  font-size: 12px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(105deg, #fff2df, #ffe6c7);
}

:global(.app-modal .detail-row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 11px 2px;
  border-bottom: 1px dashed #eef3fa;
}

:global(.app-modal .detail-row:last-child) {
  border-bottom: 0;
}

:global(.app-modal .detail-label) {
  flex: 0 0 auto;
  color: #8190a5;
  font-size: 13px;
}

:global(.app-modal .detail-value) {
  color: #3c5677;
  font-weight: 500;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

:global(.app-modal .detail-creator) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 3px 12px 3px 4px;
  border: 1px solid #eef3fa;
  border-radius: 999px;
  background: #f8fbff;
}

:global(.app-modal .detail-creator .ant-avatar) {
  border: 1px solid #e6eefb;
}

:global(.app-modal .creator-name) {
  max-width: 160px;
  overflow: hidden;
  color: #3c5677;
  font-weight: 600;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.app-modal .detail-edit-button),
:global(.app-modal .detail-delete-button) {
  flex: 1;
}

:global(.app-modal .detail-edit-button) {
  color: #1677ff;
  border-color: #d8e8ff;
  background: #f5faff;
}

:global(.app-modal .detail-edit-button:hover),
:global(.app-modal .detail-edit-button:focus) {
  color: #fff !important;
  border-color: #1677ff !important;
  background: #1677ff !important;
  box-shadow: 0 8px 16px rgb(22 119 255 / 26%);
}

:global(.app-modal .detail-delete-button) {
  color: #e85d75;
  border-color: #ffd8df;
  background: #fff7f8;
}

:global(.app-modal .detail-delete-button:hover),
:global(.app-modal .detail-delete-button:focus) {
  color: #fff !important;
  border-color: #f0667c !important;
  background: #f0667c !important;
  box-shadow: 0 8px 16px rgb(240 102 124 / 26%);
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
  gap: 16px;
  min-height: 0;
  padding: 16px;
}

.chat-panel {
  display: flex;
  flex: 0 0 42%;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.message-list {
  flex: 1;
  padding: 20px 18px 8px;
  overflow-y: auto;
}

.message-empty {
  margin-top: 80px;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
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
  max-width: 82%;
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
  white-space: pre-wrap;
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
  margin-top: 6px;
  color: #e85d75;
  font-size: 12px;
}

.input-wrapper {
  padding: 12px 16px 16px;
}

.input-card {
  padding: 14px 16px 12px;
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

.input-card.is-readonly .tool-button:disabled,
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
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.tool-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  color: #5c6d86;
  font-size: 13px;
  background: #fff;
  border: 1px solid #eaf0f9;
  border-radius: 9px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.tool-button:hover {
  color: #1677ff;
  background: #eef5ff;
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
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 16px;
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
  padding: 12px;
  background: #f5f8fd;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #e6eefb;
  border-radius: 12px;
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
    max-width: 180px;
  }

  .chat-body {
    padding: 10px;
  }
}
</style>
