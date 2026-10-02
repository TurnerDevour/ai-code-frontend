<template>
  <a-tag class="message-type-tag" :class="typeClass" :bordered="false">
    <UserOutlined v-if="messageType === CHAT_MESSAGE_TYPE.USER" />
    <RobotOutlined v-else-if="messageType === CHAT_MESSAGE_TYPE.AI" />
    <WarningOutlined v-else />
    {{ getChatMessageTypeName(messageType) }}
  </a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RobotOutlined, UserOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { CHAT_MESSAGE_TYPE, getChatMessageTypeName } from '@/constant/chat'

const props = defineProps<{
  /** 对话消息类型（对应后端 ChatMessageTypeEnum 的 value） */
  messageType?: string
}>()

// 未知类型统一走默认样式
const typeClass = computed(() => {
  const messageType = props.messageType
  const knownTypes: string[] = Object.values(CHAT_MESSAGE_TYPE)
  return messageType && knownTypes.includes(messageType) ? `is-${messageType}` : 'is-unknown'
})
</script>

<style scoped>
.message-type-tag {
  display: inline-flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
  min-width: 84px;
  margin: 0;
  padding: 3px 10px;
  font-weight: 600;
  font-size: 12px;
  border-radius: 999px;
}

.is-user {
  color: #1677ff;
  background: #eaf3ff;
  box-shadow: inset 0 0 0 1px #d8e8ff;
}

.is-ai {
  color: #0f766e;
  background: #e8faf4;
  box-shadow: inset 0 0 0 1px #c3ece1;
}

.is-error {
  color: #e85d75;
  background: #fff2f4;
  box-shadow: inset 0 0 0 1px #ffd8df;
}

.is-unknown {
  color: #64748b;
  background: #f5f8fd;
  box-shadow: inset 0 0 0 1px #e2eaf5;
}
</style>
