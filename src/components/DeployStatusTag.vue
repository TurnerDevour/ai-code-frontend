<template>
  <PillTag
    class="deploy-status-tag"
    tone="plain"
    :ant-color="meta.color"
    :label="label"
    :clickable="clickable"
    @click="handleClick"
  >
    <!-- 部署中需要旋转，故用插槽传入带 spin 的图标 -->
    <template #icon>
      <LoadingOutlined v-if="status === DEPLOY_STATUS.DEPLOYING" class="pill-icon" spin />
      <ClockCircleOutlined v-else-if="status === DEPLOY_STATUS.QUEUED" class="pill-icon" />
      <ExclamationCircleOutlined v-else-if="stale" class="pill-icon" />
      <CheckCircleOutlined v-else-if="status === DEPLOY_STATUS.READY" class="pill-icon" />
      <CloseCircleOutlined v-else-if="status === DEPLOY_STATUS.FAILED" class="pill-icon" />
    </template>
  </PillTag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import PillTag from '@/components/PillTag.vue'
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
    /** 已部署但代码改过：标签展示「已部署(有更新)」 */
    stale?: boolean
  }>(),
  {
    status: '',
    queuePosition: null,
    deployUrl: '',
    stale: false,
  },
)

const meta = computed(() => getDeployStatusMeta(props.status))
const label = computed(() =>
  formatDeployStatusLabel(props.status, props.queuePosition, props.stale),
)
/** 仅「已部署」且拿到地址时标签可点击 */
const clickable = computed(() => props.status === DEPLOY_STATUS.READY && !!props.deployUrl)

const handleClick = () => {
  if (clickable.value) {
    window.open(props.deployUrl as string, '_blank')
  }
}
</script>
