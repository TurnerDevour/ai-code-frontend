<template>
  <AppModal
    :open="open"
    title="应用详情"
    subtitle="查看应用的基础信息"
    :icon="ProfileOutlined"
    @update:open="handleOpenChange"
  >
    <div class="detail-section-title">应用基础信息</div>
    <div class="detail-app">
      <div class="detail-app-cover">
        <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
        <span v-else>{{ coverText }}</span>
      </div>
      <div class="detail-app-meta">
        <div class="detail-app-head">
          <div class="detail-app-name" :title="app.appName">{{ app.appName || '未命名应用' }}</div>
          <AppPriorityTag class="detail-app-priority" :priority="app.priority" compact />
        </div>
        <div class="detail-app-type">
          <CodeGenTypeTag :code-gen-type="app.codeGenType" />
          <AiModelTypeTag :ai-model-type="app.aiModelType" />
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
    <!-- 部署状态以 /app/deploy/status 的 status 字段为准，不用 deployKey 猜是否已部署 -->
    <div class="detail-row">
      <span class="detail-label">部署状态</span>
      <a-tooltip :title="deployTip">
        <DeployStatusTag
          :status="deployStatus?.status"
          :queue-position="deployStatus?.queuePosition"
          :deploy-url="deployStatus?.deployUrl"
        />
      </a-tooltip>
    </div>
    <div v-if="deployedTime" class="detail-row">
      <span class="detail-label">部署时间</span>
      <span class="detail-value">{{ deployedTime }}</span>
    </div>

    <template v-if="canManage" #footer>
      <a-button class="app-modal-button detail-edit-button" @click="emit('edit')">
        <EditOutlined />
        修改
      </a-button>
      <DeleteAppButton @confirm="emit('delete')">
        <a-button class="app-modal-button detail-delete-button" :loading="deleting">
          <DeleteOutlined />
          删除
        </a-button>
      </DeleteAppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DeleteOutlined, EditOutlined, ProfileOutlined, UserOutlined } from '@ant-design/icons-vue'
import AppModal from '@/components/AppModal.vue'
import AppPriorityTag from '@/components/AppPriorityTag.vue'
import CodeGenTypeTag from '@/components/CodeGenTypeTag.vue'
import AiModelTypeTag from '@/components/AiModelTypeTag.vue'
import DeployStatusTag from '@/components/DeployStatusTag.vue'
import DeleteAppButton from '@/components/DeleteAppButton.vue'
import { describeDeployStatus } from '@/utils/deploy'
import { formatDateTime } from '@/utils/time'

const props = withDefaults(
  defineProps<{
    /** 配合 v-model:open 使用 */
    open?: boolean
    app: API.AppVO
    /** 部署状态（来自 GET /app/deploy/status），未传时展示「未部署」 */
    deployStatus?: API.DeployStatusVO | null
    /** 是否展示「修改 / 删除」操作（本人或管理员） */
    canManage?: boolean
    deleting?: boolean
  }>(),
  {
    open: false,
    deployStatus: null,
    canManage: false,
    deleting: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'edit'): void
  (e: 'delete'): void
}>()

const coverText = computed(() => (props.app.appName || '未')[0])

/** 悬浮说明：排队进度与失败原因 */
const deployTip = computed(() => describeDeployStatus(props.deployStatus))

/** 部署时间仅部署成功后由后端下发，且是 ISO 8601（如 2026-10-07T13:45:08），
 *  与「创建时间」的写法不一致，故统一格式化成 YYYY-MM-DD HH:mm:ss */
const deployedTime = computed(() => formatDateTime(props.deployStatus?.deployedTime))

const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
}
</script>

<!-- 弹窗被 teleport 到 body，作用域选择器命中不了内部节点，因此统一使用 :global -->
<style scoped>
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
  flex: 1;
  min-width: 0;
}

/* 名称与优先级标签同一行：名称过长时省略，标签始终完整可见 */
:global(.app-modal .detail-app-head) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

:global(.app-modal .detail-app-name) {
  min-width: 0;
  overflow: hidden;
  color: #172b4d;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.app-modal .detail-app-priority) {
  flex: 0 0 auto;
}

:global(.app-modal .detail-app-type) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

/* 标签保持自身尺寸、宽度不足时换行：否则最后一个标签（compact 下 min-width: 0）会被单独压缩，
   配合 overflow: hidden 直接把文字裁掉，出现「默认应用」显示不全 */
:global(.app-modal .detail-app-type > *) {
  flex: 0 0 auto;
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
</style>
