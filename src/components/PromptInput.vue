<template>
  <div ref="cardRef" class="prompt-input" :class="{ 'is-loading': loading }">
    <span class="card-glow glow-left"></span>
    <span class="card-glow glow-right"></span>

    <!-- 预设提示词：置于输入卡片顶部，快速填充并直接创建 -->
    <div v-if="presets.length" class="prompt-presets">
      <span class="presets-label">
        <BulbOutlined />
        灵感推荐
      </span>
      <div class="presets-list">
        <button
          v-for="preset in presets"
          :key="preset"
          type="button"
          class="preset-button"
          :disabled="loading"
          @click="handlePreset(preset)"
        >
          <StarOutlined class="preset-icon" />
          <span class="preset-text">{{ preset }}</span>
        </button>
      </div>
    </div>

    <!-- 提示词输入区 -->
    <div class="prompt-editor">
      <a-textarea
        v-model:value="value"
        class="prompt-textarea"
        :rows="3"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :disabled="loading"
        @press-enter="handlePressEnter"
      />
    </div>

    <!-- 工具栏：生成配置（左） + 字数与发送（右） -->
    <div class="prompt-toolbar">
      <div class="toolbar-config">
        <div class="config-field">
          <span class="field-label">代码模式</span>
          <a-select
            v-model:value="codeGenType"
            class="config-select code-gen-select"
            popup-class-name="prompt-select-dropdown"
            :disabled="loading"
            :options="codeGenTypeOptions"
            :get-popup-container="getPopupContainer"
          >
            <template #option="{ label, icon }">
              <span class="select-option">
                <component :is="icon || FileTextOutlined" class="select-option-icon" />
                <span class="select-option-label">{{ label }}</span>
              </span>
            </template>
          </a-select>
        </div>

        <span class="config-divider"></span>

        <div class="config-field">
          <span class="field-label">AI 模型</span>
          <a-select
            v-model:value="aiModelType"
            class="config-select model-select"
            popup-class-name="prompt-select-dropdown"
            :disabled="loading"
            :options="aiModelTypeOptions"
            :get-popup-container="getPopupContainer"
          >
            <template #option="{ label, icon }">
              <span class="select-option">
                <component :is="icon || ThunderboltOutlined" class="select-option-icon" />
                <span class="select-option-label">{{ label }}</span>
              </span>
            </template>
          </a-select>
        </div>
      </div>

      <div class="toolbar-actions">
        <span class="toolbar-counter" :class="{ 'is-limit': isAtLimit }">
          {{ value.length }} / {{ maxlength }}
        </span>
        <span class="toolbar-hint">
          <kbd class="hint-key">Enter</kbd>
          发送
          <span class="hint-divider"></span>
          <kbd class="hint-key">Shift</kbd>
          +
          <kbd class="hint-key">Enter</kbd>
          换行
        </span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  ArrowUpOutlined,
  BulbOutlined,
  CodeOutlined,
  FileTextOutlined,
  LayoutOutlined,
  LoadingOutlined,
  RocketOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { CODE_GEN_TYPE, CODE_GEN_TYPE_OPTIONS } from '@/constant/codeGenType'
import type { CodeGenType } from '@/constant/codeGenType'
import { AI_MODEL_TYPE, AI_MODEL_TYPE_OPTIONS } from '@/constant/aiModelType'
import type { AiModelType } from '@/constant/aiModelType'

/** 每个选项配一个图标，让下拉列表更易扫读 */
const CODE_GEN_TYPE_ICONS: Record<string, unknown> = {
  [CODE_GEN_TYPE.HTML]: FileTextOutlined,
  [CODE_GEN_TYPE.MULTI_FILE]: CodeOutlined,
  [CODE_GEN_TYPE.VUE_PROJECT]: LayoutOutlined,
}
const AI_MODEL_TYPE_ICONS: Record<string, unknown> = {
  [AI_MODEL_TYPE.DEEPSEEK_FLASH]: ThunderboltOutlined,
  [AI_MODEL_TYPE.DEEPSEEK_V4_PRO]: RocketOutlined,
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    loading?: boolean
    placeholder?: string
    /** 预设提示词，不传则不展示推荐区域 */
    presets?: readonly string[]
    /** 最大可输入字符数 */
    maxlength?: number
    codeGenType?: CodeGenType
    aiModelType?: AiModelType
  }>(),
  {
    modelValue: '',
    loading: false,
    placeholder: '请描述你想生成的网站，越详细效果越好哦',
    presets: () => [],
    maxlength: 1000,
    codeGenType: CODE_GEN_TYPE.MULTI_FILE,
    aiModelType: AI_MODEL_TYPE.DEEPSEEK_FLASH,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:codeGenType', value: CodeGenType): void
  (e: 'update:aiModelType', value: AiModelType): void
  (
    e: 'submit',
    value: string,
    options: { codeGenType: CodeGenType; aiModelType: AiModelType },
  ): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const codeGenType = computed({
  get: () => props.codeGenType,
  set: (val: CodeGenType) => emit('update:codeGenType', val),
})

const aiModelType = computed({
  get: () => props.aiModelType,
  set: (val: AiModelType) => emit('update:aiModelType', val),
})

// 给下拉选项挂上图标组件（label / value 仍沿用常量定义，避免影响其它页面）
const codeGenTypeOptions = CODE_GEN_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: CODE_GEN_TYPE_ICONS[option.value] ?? FileTextOutlined,
}))
const aiModelTypeOptions = AI_MODEL_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: AI_MODEL_TYPE_ICONS[option.value] ?? ThunderboltOutlined,
}))

const cardRef = ref<HTMLElement | null>(null)
// 下拉浮层挂到卡片内部，避免浮层独立挂载在 body 上时脱离视觉上下文
const getPopupContainer = () => cardRef.value ?? document.body

const isAtLimit = computed(() => value.value.length >= props.maxlength)

const handleSubmit = () => {
  const current = value.value.trim()
  if (!current) {
    message.warning('请输入应用描述').then(() => {})
    return
  }
  emit('submit', current, {
    codeGenType: codeGenType.value,
    aiModelType: aiModelType.value,
  })
}

const handlePreset = (preset: string) => {
  value.value = preset
  emit('submit', preset, {
    codeGenType: codeGenType.value,
    aiModelType: aiModelType.value,
  })
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
/* ---- 卡片外壳 ---- */
.prompt-input {
  position: relative;
  padding: 14px 16px 12px;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #e8eff9;
  border-radius: 20px;
  box-shadow:
    0 18px 44px rgb(31 73 125 / 12%),
    0 2px 8px rgb(31 73 125 / 4%);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  backdrop-filter: blur(12px);
}

/* 卡片内的两个柔光装饰，呼应首页背景光斑 */
.card-glow {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
}

.glow-left {
  top: -70px;
  left: -80px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgb(219 234 254 / 85%) 0%, rgb(219 234 254 / 0%) 70%);
}

.glow-right {
  right: -90px;
  bottom: -90px;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgb(216 247 238 / 80%) 0%, rgb(216 247 238 / 0%) 70%);
}

.prompt-input:focus-within {
  border-color: #bfdbfe;
  box-shadow:
    0 20px 46px rgb(31 73 125 / 14%),
    0 0 0 4px rgb(22 119 255 / 9%);
}

.prompt-input > *:not(.card-glow) {
  position: relative;
  z-index: 1;
}

/* ---- 预设提示词 ---- */
.prompt-presets {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px dashed #e8eff9;
}

.presets-label {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 5px;
  align-items: center;
  color: #8190a5;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.presets-label :deep(.anticon) {
  color: #1677ff;
  font-size: 13px;
}

.presets-list {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.presets-list::-webkit-scrollbar {
  display: none;
}

.preset-button {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  height: 30px;
  padding: 0 13px;
  color: #48658b;
  font-size: 13px;
  white-space: nowrap;
  background: #f7f9fc;
  border: 1px solid #e8eff9;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.preset-button:hover:not(:disabled),
.preset-button:focus-visible:not(:disabled) {
  color: #1677ff;
  background: #eef5ff;
  border-color: #bfdbfe;
  box-shadow: 0 6px 14px rgb(22 119 255 / 14%);
  transform: translateY(-1px);
}

.preset-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.preset-icon {
  color: #9db4d4;
  font-size: 11px;
  transition: color 0.2s ease;
}

.preset-button:hover:not(:disabled) .preset-icon {
  color: #1677ff;
}

.preset-text {
  max-width: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 输入区 ---- */
.prompt-editor {
  padding: 10px 2px 2px;
}

.prompt-textarea {
  padding: 0;
  color: #172b4d;
  font-size: 15px;
  line-height: 1.7;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.prompt-textarea :deep(textarea) {
  padding: 0;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
  background: transparent;
  border: 0;
  box-shadow: none;
  resize: none;
}

.prompt-textarea :deep(textarea::placeholder) {
  color: #9aa9bf;
}

/* ---- 工具栏 ---- */
.prompt-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid #f2f6fc;
}

.toolbar-config {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.config-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field-label {
  color: #8190a5;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.config-divider {
  width: 1px;
  height: 18px;
  background: #eaf0f9;
}

/* 下拉框：胶囊形，与站点按钮 / 搜索框的圆角与配色统一 */
.config-select {
  min-width: 132px;
}

.model-select {
  min-width: 172px;
}

.config-select :deep(.ant-select-selector) {
  height: 32px !important;
  padding: 0 11px !important;
  background: #f7f9fc !important;
  border-color: #e8eff9 !important;
  border-radius: 10px !important;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.config-select :deep(.ant-select-selection-item),
.config-select :deep(.ant-select-selection-placeholder) {
  color: #48658b;
  font-size: 13px;
  font-weight: 500;
  line-height: 30px !important;
}

.config-select :deep(.ant-select-arrow) {
  color: #9db4d4;
  font-size: 11px;
}

.config-select:hover :deep(.ant-select-selector) {
  background: #fff !important;
  border-color: #bfdbfe !important;
}

.config-select.ant-select-focused :deep(.ant-select-selector),
.config-select.ant-select-open :deep(.ant-select-selector) {
  background: #fff !important;
  border-color: #91caff !important;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 9%) !important;
}

/* ---- 右侧：字数 / 快捷键 / 发送 ---- */
.toolbar-actions {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.toolbar-counter {
  color: #a3b1c4;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.toolbar-counter.is-limit {
  color: #e85d75;
  font-weight: 600;
}

.toolbar-hint {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: #a3b1c4;
  font-size: 12px;
  white-space: nowrap;
}

.hint-key {
  padding: 1px 6px;
  color: #7a8ba6;
  font-family: inherit;
  font-size: 11px;
  line-height: 16px;
  background: #f7f9fc;
  border: 1px solid #eaf0f9;
  border-radius: 5px;
}

.hint-divider {
  width: 1px;
  height: 12px;
  margin: 0 5px;
  background: #e4ebf5;
}

.submit-button {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  color: #fff;
  font-size: 17px;
  border: 0;
  border-radius: 50%;
  place-items: center;
  cursor: pointer;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 8px 18px rgb(54 103 210 / 28%);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  box-shadow: 0 10px 22px rgb(54 103 210 / 34%);
  transform: translateY(-1px);
}

.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

/* 生成中：卡片整体弱化交互提示 */
.prompt-input.is-loading :deep(.ant-select-selector) {
  background: #f4f7fc !important;
}

@media (max-width: 760px) {
  .prompt-input {
    padding: 12px 13px 10px;
    border-radius: 16px;
  }

  .field-label {
    display: none;
  }

  .config-divider {
    display: none;
  }

  .config-select,
  .model-select {
    min-width: 0;
  }

  .config-field {
    flex: 1;
    min-width: 0;
  }

  .config-select {
    width: 100%;
  }

  .toolbar-config {
    flex: 1 1 100%;
  }

  .toolbar-hint {
    display: none;
  }

  .prompt-presets {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .presets-list {
    width: 100%;
  }
}
</style>

<!--
  下拉浮层通过 getPopupContainer 挂载到卡片内，但选项节点由 ant-design-vue 的
  vc-select 渲染（带自己的 scopeId），且浮层可能被 Teleport 到组件根节点之外，
  因此这里用 popup-class-name 定位，走非 scoped 样式。
-->
<style>
.prompt-select-dropdown {
  min-width: 196px;
  padding: 6px;
  margin-top: 4px;
  border: 1px solid #e8eff9;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgb(31 73 125 / 16%);
}

.prompt-select-dropdown .ant-select-item {
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 9px;
}

.prompt-select-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
  background: #f2f7ff;
}

.prompt-select-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
  color: #1677ff;
  font-weight: 600;
  background: linear-gradient(105deg, #eef5ff, #f2f0ff);
}

.prompt-select-dropdown
  .ant-select-item-option-selected:not(.ant-select-item-option-disabled)
  .ant-select-item-option-state {
  color: #1677ff;
}

.select-option {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.select-option-icon {
  color: #1677ff;
  font-size: 14px;
}

.select-option-label {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
