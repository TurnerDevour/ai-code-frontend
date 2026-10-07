<template>
  <PillTag
    tone="violet"
    :icon="showIcon ? ThunderboltOutlined : undefined"
    :label="getAiModelTypeName(aiModelType)"
  />
</template>

<script setup lang="ts">
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import PillTag from '@/components/PillTag.vue'
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
