<template>
  <PillTag
    :tone="meta.tone"
    :icon="meta.icon"
    :label="getChatMessageTypeName(messageType)"
    :min-width="84"
  />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RobotOutlined, UserOutlined, WarningOutlined } from '@ant-design/icons-vue'
import PillTag, { type PillTagTone } from '@/components/PillTag.vue'
import { CHAT_MESSAGE_TYPE, getChatMessageTypeName } from '@/constant/chat'

const props = defineProps<{
  /** 对话消息类型（对应后端 ChatMessageTypeEnum 的 value） */
  messageType?: string
}>()

const MESSAGE_TYPE_META: Record<string, { tone: PillTagTone; icon: Component }> = {
  [CHAT_MESSAGE_TYPE.USER]: { tone: 'blue', icon: UserOutlined },
  [CHAT_MESSAGE_TYPE.AI]: { tone: 'teal', icon: RobotOutlined },
  [CHAT_MESSAGE_TYPE.ERROR]: { tone: 'rose', icon: WarningOutlined },
}

// 未知类型（如后端新增枚举）统一走默认样式
const meta = computed(
  () =>
    MESSAGE_TYPE_META[props.messageType ?? ''] ?? {
      tone: 'slate' as PillTagTone,
      icon: WarningOutlined,
    },
)
</script>
