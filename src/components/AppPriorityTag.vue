<template>
  <div class="priority-cell" :class="{ 'is-compact': compact }">
    <a-tooltip :title="`优先级：${normalizedPriority}`">
      <PillTag
        :tone="meta.tone"
        :icon="meta.icon"
        :label="meta.label"
        :compact="compact"
        :interactive="!compact"
        :min-width="compact ? undefined : 82"
      />
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { HomeOutlined, StarFilled, ThunderboltOutlined } from '@ant-design/icons-vue'
import PillTag, { type PillTagTone } from '@/components/PillTag.vue'
import { DEFAULT_APP_PRIORITY, GOOD_APP_PRIORITY } from '@/constant/app'

const props = withDefaults(
  defineProps<{
    /** 应用优先级，未设置时按默认优先级展示 */
    priority?: number
    /** 紧凑模式：用于弹窗等窄空间 */
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const normalizedPriority = computed(() => props.priority ?? DEFAULT_APP_PRIORITY)

const meta = computed<{ tone: PillTagTone; icon: Component; label: string }>(() => {
  if (normalizedPriority.value === GOOD_APP_PRIORITY) {
    return { tone: 'good', icon: StarFilled, label: '精选' }
  }
  if (normalizedPriority.value === DEFAULT_APP_PRIORITY) {
    return { tone: 'default', icon: HomeOutlined, label: '默认应用' }
  }
  return { tone: 'custom', icon: ThunderboltOutlined, label: String(normalizedPriority.value) }
})
</script>

<style scoped>
.priority-cell {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 96px;
}

.priority-cell.is-compact {
  min-width: 0;
}
</style>
