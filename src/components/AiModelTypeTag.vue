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
    showIcon?: boolean
  }>(),
  {
    showIcon: false,
  },
)
</script>
