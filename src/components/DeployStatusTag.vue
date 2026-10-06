<template>
  <a-tag
    class="deploy-status-tag"
    :class="{ 'is-clickable': clickable }"
    :color="meta.color"
    :bordered="false"
    @click="handleClick"
  >
    <LoadingOutlined v-if="status === DEPLOY_STATUS.DEPLOYING" class="tag-icon" spin />
    <ClockCircleOutlined v-else-if="status === DEPLOY_STATUS.QUEUED" class="tag-icon" />
    <CheckCircleOutlined v-else-if="status === DEPLOY_STATUS.READY" class="tag-icon" />
    <CloseCircleOutlined v-else-if="status === DEPLOY_STATUS.FAILED" class="tag-icon" />
    {{ label }}
  </a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import { DEPLOY_STATUS, getDeployStatusMeta } from '@/constant/deploy'
import { formatDeployStatusLabel } from '@/utils/deploy'

const props = withDefaults(
  defineProps<{
    /** 部署状态（DeployStatusVO.status） */
    status?: string
    /** 排队位次：status=queued 时标签展示「排队中(第 N 位)」 */
    queuePosition?: number | null
    /** 部署地址：status=ready 时点击标签即可打开部署后的站点 */
    deployUrl?: string | null
  }>(),
  {
    status: '',
    queuePosition: null,
    deployUrl: '',
  },
)

const meta = computed(() => getDeployStatusMeta(props.status))
const label = computed(() => formatDeployStatusLabel(props.status, props.queuePosition))
/** 只有「已部署」且拿到地址时标签才可点击 */
const clickable = computed(() => props.status === DEPLOY_STATUS.READY && !!props.deployUrl)

const handleClick = () => {
  if (clickable.value) {
    window.open(props.deployUrl as string, '_blank')
  }
}
</script>

<style scoped>
.deploy-status-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin: 0;
  padding: 2px 10px;
  font-weight: 600;
  font-size: 12px;
  border-radius: 999px;
}

.deploy-status-tag.is-clickable {
  cursor: pointer;
}

.tag-icon {
  font-size: 11px;
}
</style>
