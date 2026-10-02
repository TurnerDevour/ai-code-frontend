<template>
  <div class="prompt-input">
    <a-textarea
      v-model:value="value"
      class="prompt-textarea"
      :rows="3"
      :maxlength="1000"
      :placeholder="placeholder"
      :disabled="loading"
      @press-enter="handlePressEnter"
    />
    <div class="prompt-toolbar">
      <span class="toolbar-hint">Enter 快速发送，Shift + Enter 换行</span>
      <button
        type="button"
        class="submit-button"
        :disabled="loading || !value.trim()"
        @click="handleSubmit"
      >
        <LoadingOutlined v-if="loading" />
        <ArrowUpOutlined v-else />
      </button>
    </div>
    <div v-if="presets.length" class="prompt-presets">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="preset-button"
        :disabled="loading"
        @click="handlePreset(preset)"
      >
        {{ preset }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { ArrowUpOutlined, LoadingOutlined } from '@ant-design/icons-vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    loading?: boolean
    placeholder?: string
    presets?: readonly string[]
  }>(),
  {
    modelValue: '',
    loading: false,
    placeholder: '请描述你想生成的网站，越详细效果越好哦',
    presets: () => [],
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const handleSubmit = () => {
  const current = value.value.trim()
  if (!current) {
    message.warning('请输入应用描述').then(() => {})
    return
  }
  emit('submit', current)
}

const handlePreset = (preset: string) => {
  value.value = preset
  emit('submit', preset)
}

const handlePressEnter = (event: KeyboardEvent) => {
  // Enter 直接提交，Shift + Enter 换行
  if (event.shiftKey) {
    return
  }
  event.preventDefault()
  handleSubmit()
}
</script>

<style scoped>
.prompt-input {
  padding: 20px 22px 16px;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(255 255 255 / 90%);
  border-radius: 22px;
  box-shadow: 0 22px 55px rgb(31 73 125 / 14%);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  backdrop-filter: blur(12px);
}

.prompt-input:focus-within {
  border-color: #bfdbfe;
  box-shadow:
    0 22px 55px rgb(31 73 125 / 16%),
    0 0 0 4px rgb(22 119 255 / 9%);
}

.prompt-textarea {
  padding: 0;
  font-size: 15px;
  line-height: 1.7;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.prompt-textarea :deep(textarea) {
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.prompt-textarea :deep(textarea::placeholder) {
  color: #9aa9bf;
}

.prompt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.toolbar-hint {
  color: #a3b1c4;
  font-size: 12px;
}

.submit-button {
  display: grid;
  width: 40px;
  height: 40px;
  color: #fff;
  font-size: 17px;
  border: 0;
  border-radius: 50%;
  place-items: center;
  cursor: pointer;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 10px 20px rgb(54 103 210 / 28%);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.prompt-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
}

.preset-button {
  padding: 7px 16px;
  color: #5c6d86;
  font-size: 13px;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(226 236 249 / 90%);
  border-radius: 12px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.preset-button:hover:not(:disabled) {
  color: #1677ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}
</style>
