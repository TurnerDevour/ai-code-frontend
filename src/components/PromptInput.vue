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
      <div class="toolbar-left">
        <a-upload
          :show-upload-list="false"
          :before-upload="beforeUpload"
          accept="image/*"
          :disabled="loading"
        >
          <button type="button" class="tool-button">
            <PaperClipOutlined />
            上传
          </button>
        </a-upload>
        <button type="button" class="tool-button" :disabled="loading" @click="handleOptimize">
          <BulbOutlined />
          优化
        </button>
      </div>
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
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  ArrowUpOutlined,
  BulbOutlined,
  LoadingOutlined,
  PaperClipOutlined,
} from '@ant-design/icons-vue'

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
    placeholder: '描述越详细，页面越具体，可以一步一步完善生成效果',
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

// 上传图片后将图片链接拼接进提示词
const uploadedImages = ref<string[]>([])

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件').then(() => {})
    return false
  }
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result ?? '')
    uploadedImages.value.push(result)
    value.value = `${value.value}${value.value ? '\n' : ''}请参考图片：${result}`
  }
  reader.readAsDataURL(file)
  // 仅用于本地预览，不上传到服务器
  return false
}

const handleOptimize = () => {
  const current = value.value.trim()
  if (!current) {
    message.warning('请先输入应用描述').then(() => {})
    return
  }
  value.value = `${current}\n\n要求：页面结构清晰、视觉精美、支持响应式布局，交互流畅，可直接运行。`
  message.success('已为你补充细节描述').then(() => {})
}

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
  padding: 18px 20px 16px;
  background: rgb(255 255 255 / 94%);
  border: 1px solid rgb(255 255 255 / 90%);
  border-radius: 22px;
  box-shadow: 0 22px 55px rgb(31 73 125 / 14%);
  backdrop-filter: blur(12px);
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
  margin-top: 12px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.tool-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  color: #5c6d86;
  font-size: 13px;
  background: #f4f7fc;
  border: 1px solid #eaf0f9;
  border-radius: 10px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.tool-button:hover {
  color: #1677ff;
  background: #eef5ff;
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
