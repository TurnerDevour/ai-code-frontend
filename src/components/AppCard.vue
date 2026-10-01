<template>
  <article class="app-card" @click="handleViewChat">
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
      <button type="button" class="card-action chat-action" @click.stop="handleViewChat">
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

const props = withDefaults(
  defineProps<{
    app: API.AppVO
    /** 是否展示精选标识 */
    showPriority?: boolean
  }>(),
  {
    showPriority: true,
  },
)

const emit = defineEmits<{
  /** 点击卡片或「查看对话」 */
  (e: 'view-chat', app: API.AppVO): void
}>()

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
  padding: 16px 18px 18px;
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
</style>
