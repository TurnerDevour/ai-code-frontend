<template>
  <article class="app-card" :class="{ 'is-chat-disabled': !canViewChat }" @click="handleViewChat">
    <div class="card-cover">
      <img
        v-if="app.cover"
        class="cover-image"
        :src="app.cover"
        :alt="app.appName"
        crossorigin="anonymous"
      />
      <div v-else class="cover-placeholder">
        <span class="placeholder-title">{{ app.appName || '未命名应用' }}</span>
        <span class="placeholder-tip">与 AI 对话即可生成应用</span>
      </div>
      <span v-if="showPriority && app.priority === GOOD_APP_PRIORITY" class="cover-badge">
        <StarFilled />
        精选
      </span>
    </div>
    <div class="card-body">
      <h3 class="card-title" :title="app.appName">{{ app.appName || '未命名应用' }}</h3>
      <!-- 生成配置：代码模式 + AI 模型（老数据可能没有，缺一项就不展示该标签） -->
      <div v-if="app.codeGenType || app.aiModelType" class="card-config">
        <CodeGenTypeTag v-if="app.codeGenType" :code-gen-type="app.codeGenType" show-icon />
        <AiModelTypeTag v-if="app.aiModelType" :ai-model-type="app.aiModelType" show-icon />
      </div>
      <div class="card-meta">
        <a-avatar :size="26" :src="app.user?.userAvatar">
          <template #icon><UserOutlined /></template>
        </a-avatar>
        <span class="author">{{ app.user?.username ?? '匿名用户' }}</span>
        <span class="meta-divider"></span>
        <span class="time">创建于 {{ formatRelativeTime(app.createTime) }}</span>
      </div>
    </div>
    <footer class="card-actions">
      <!-- 无权限时不用原生 disabled：那样点击事件不会触发，用户得不到任何解释。
           这里用 aria-disabled + 禁用态样式，点击时给出提示 -->
      <button
        type="button"
        class="card-action chat-action"
        :class="{ 'is-disabled': !canViewChat }"
        :aria-disabled="!canViewChat"
        :title="canViewChat ? '' : '无权限查看该应用'"
        @click.stop="handleViewChat"
      >
        <MessageOutlined />
        查看对话
      </button>
      <button
        v-if="app.deployKey"
        type="button"
        class="card-action work-action"
        @click.stop="handleViewWork"
      >
        <ExportOutlined />
        查看作品
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { UserOutlined, StarFilled, MessageOutlined, ExportOutlined } from '@ant-design/icons-vue'
import { formatRelativeTime } from '@/utils/time'
import { GOOD_APP_PRIORITY } from '@/constant/app'
import { getDeployUrl } from '@/utils/apiUrl'
import CodeGenTypeTag from '@/components/CodeGenTypeTag.vue'
import AiModelTypeTag from '@/components/AiModelTypeTag.vue'

const props = withDefaults(
  defineProps<{
    app: API.AppVO
    /** 是否展示精选标识 */
    showPriority?: boolean
    /** 是否可以查看该应用的对话（创建者与当前登录者一致时才放行） */
    canViewChat?: boolean
  }>(),
  {
    showPriority: true,
    canViewChat: true,
  },
)

const emit = defineEmits<{
  /** 点击卡片或「查看对话」 */
  (e: 'view-chat', app: API.AppVO): void
}>()

// 点击整卡等于点击「查看对话」：权限由首页统一校验，
// 无权限时首页会拦截并提示「无权限查看该应用」
const handleViewChat = () => {
  emit('view-chat', props.app)
}

// 查看作品：部署地址与应用生成产物的浏览地址不同
const handleViewWork = () => {
  if (!props.app.deployKey) {
    return
  }
  window.open(getDeployUrl(props.app.deployKey), '_blank')
}
</script>

<style scoped>
.app-card {
  display: flex;
  flex-direction: column;

  /* 宽度跟随所在列（列宽上限由首页 .app-grid 的 440px 决定），
     卡片自身不再撑宽，避免应用很少时被拉成细长条 */
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eef3fa;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgb(31 73 125 / 7%);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.app-card:hover {
  border-color: #d7e7ff;
  box-shadow: 0 18px 40px rgb(31 73 125 / 14%);
  transform: translateY(-4px);
}

.card-cover {
  position: relative;
  height: 168px;
  overflow: hidden;
  background: linear-gradient(135deg, #eef5ff, #e6fbf6);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.4s ease;
}

.app-card:hover .cover-image {
  transform: scale(1.04);
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  height: 100%;
  padding: 0 18px;
  text-align: center;
  background: linear-gradient(135deg, #eff6ff, #e7fbf5);
}

.placeholder-title {
  color: #2c4a75;
  font-weight: 700;
  font-size: 18px;
  line-height: 1.4;
}

.placeholder-tip {
  color: #8fa4c1;
  font-size: 12px;
}

.cover-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 9px;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  border-radius: 20px;
  background: linear-gradient(105deg, #ff9a3d, #ff6b6b);
  box-shadow: 0 6px 14px rgb(255 122 82 / 32%);
}

.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 14px;
}

.card-title {
  margin: 0;
  overflow: hidden;
  color: #172b4d;
  font-weight: 700;
  font-size: 16px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 生成配置：与卡片内其它信息块统一为浅底 + 细描边 + 10px 圆角 */
.card-config {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #eef3fa;
  border-radius: 10px;
  background: #f8fbff;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8190a5;
  font-size: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 18px 16px;
}

.card-action {
  display: inline-flex;
  flex: 1;
  gap: 5px;
  justify-content: center;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.card-action:hover {
  transform: translateY(-1px);
}

.card-action:active {
  transform: translateY(0) scale(0.98);
}

.chat-action {
  color: #1677ff;
  border-color: #d8e8ff;
  background: #f5faff;
}

.chat-action:hover {
  color: #fff;
  border-color: #1677ff;
  background: #1677ff;
  box-shadow: 0 6px 14px rgb(22 119 255 / 26%);
}

.work-action {
  color: #0f766e;
  border-color: #c9ece3;
  background: #f2fcf9;
}

.work-action:hover {
  color: #fff;
  border-color: #12a594;
  background: #12a594;
  box-shadow: 0 6px 14px rgb(18 165 148 / 26%);
}

.author {
  max-width: 96px;
  overflow: hidden;
  color: #5a6b83;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-divider {
  width: 1px;
  height: 11px;
  background: #e2e9f4;
}

.time {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 非创建者：整卡不再有可点击的反馈，避免误导成能进去 */
.app-card.is-chat-disabled {
  cursor: default;
}

.app-card.is-chat-disabled:hover {
  border-color: #eef3fa;
  box-shadow: 0 12px 30px rgb(31 73 125 / 7%);
  transform: none;
}

/* 「查看对话」禁用态：置灰 + 禁止光标，hover 时给出文字说明，
   点击仍会冒泡到按钮自身的处理函数，从而弹出「无权限查看该应用」 */
.card-action.chat-action.is-disabled {
  color: #9aa9bf;
  background: #f5f7fb;
  border-color: #eaeff7;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

.card-action.chat-action.is-disabled:hover {
  color: #9aa9bf;
  background: #f5f7fb;
  border-color: #eaeff7;
  box-shadow: none;
  transform: none;
}

/* 窄屏：两个标签各占一行，避免长模型名被挤压 */
@media (max-width: 760px) {
  .card-config {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
