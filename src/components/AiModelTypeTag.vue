<template>
  <a-tag class="model-tag" :bordered="false">
    <ThunderboltOutlined v-if="showIcon" class="tag-icon" />
    {{ getAiModelTypeName(aiModelType) }}
  </a-tag>
</template>

<script setup lang="ts">
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import { getAiModelTypeName } from '@/constant/aiModelType'

withDefaults(
  defineProps<{
    /** AI 模型类型（对应后端 AIModelTypeEnum 的 value） */
    aiModelType?: string
    /** 是否展示类型图标（卡片等需要快速扫读的场景） */
    showIcon?: boolean
  }>(),
  {
    showIcon: false,
  },
)
</script>

<style scoped>
.model-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin: 0;
  padding: 2px 10px;
  color: #7c3aed;
  font-weight: 600;
  font-size: 12px;
  border: 0;
  border-radius: 999px;
  background: #f3ecff;
  box-shadow: inset 0 0 0 1px #e4d8ff;
}

.tag-icon {
  font-size: 11px;
  opacity: 0.85;
}
</style>
