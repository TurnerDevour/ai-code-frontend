<template>
  <div ref="cardRef" class="prompt-input" :class="{ 'is-loading': loading }">
    <span class="card-glow glow-left"></span>
    <span class="card-glow glow-right"></span>

    <!-- 预设提示词：点击即填充并直接创建 -->
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
            :dropdown-match-select-width="false"
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
            :dropdown-match-select-width="false"
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
        <InputHintBar :length="value.length" :maxlength="maxlength" hide-hint-on-mobile />
        <SubmitButton
          :loading="loading"
          :disabled="loading || !value.trim()"
          @click="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BulbOutlined,
  CloudOutlined,
  CodeOutlined,
  CrownOutlined,
  FileTextOutlined,
  LayoutOutlined,
  RocketOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import InputHintBar from '@/components/InputHintBar.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useEnterSubmit } from '@/composables/useEnterSubmit'
import { useMessage } from '@/composables/useMessage'
import { CODE_GEN_TYPE, CODE_GEN_TYPE_OPTIONS } from '@/constant/codeGenType'
import type { CodeGenType } from '@/constant/codeGenType'
import { AI_MODEL_TYPE, AI_MODEL_TYPE_OPTIONS } from '@/constant/aiModelType'
import type { AiModelType } from '@/constant/aiModelType'

const CODE_GEN_TYPE_ICONS: Record<string, unknown> = {
  [CODE_GEN_TYPE.HTML]: FileTextOutlined,
  [CODE_GEN_TYPE.MULTI_FILE]: CodeOutlined,
  [CODE_GEN_TYPE.VUE_PROJECT]: LayoutOutlined,
}
const AI_MODEL_TYPE_ICONS: Record<string, unknown> = {
  [AI_MODEL_TYPE.DEEPSEEK_V4_1_FLASH]: ThunderboltOutlined,
  [AI_MODEL_TYPE.DEEPSEEK_V4_PRO]: RocketOutlined,
  // 都来自阿里云百炼，用图标区分两个系列：DeepSeek 闪电 / 火箭，Qwen 皇冠 / 云
  [AI_MODEL_TYPE.QWEN_3_8_MAX]: CrownOutlined,
  [AI_MODEL_TYPE.QWEN_3_8_FLASH]: CloudOutlined,
}

const { warning } = useMessage()

const props = withDefaults(
  defineProps<{
    modelValue?: string
    loading?: boolean
    placeholder?: string
    /** 预设提示词，不传则不展示推荐区域 */
    presets?: readonly string[]
    maxlength?: number
    codeGenType?: CodeGenType
    aiModelType?: AiModelType
  }>(),
  {
    modelValue: '',
    loading: false,
    placeholder: '请描述你想生成的网站，越详细效果越好哦',
    presets: () => [],
    maxlength: 2000,
    codeGenType: CODE_GEN_TYPE.MULTI_FILE,
    aiModelType: AI_MODEL_TYPE.DEEPSEEK_V4_1_FLASH,
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

// 只补 icon，label / value 仍沿用常量定义，避免影响其它页面
const codeGenTypeOptions = CODE_GEN_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: CODE_GEN_TYPE_ICONS[option.value] ?? FileTextOutlined,
}))
const aiModelTypeOptions = AI_MODEL_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: AI_MODEL_TYPE_ICONS[option.value] ?? ThunderboltOutlined,
}))

const cardRef = ref<HTMLElement | null>(null)
// 浮层挂在卡片内，避免独立挂载在 body 上后脱离视觉上下文
const getPopupContainer = () => cardRef.value ?? document.body

const handleSubmit = () => {
  const current = value.value.trim()
  if (!current) {
    warning('请输入应用描述')
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

// 回车提交、Shift+回车换行，输入法组合期间不提交（与对话页输入框共用）
const { handlePressEnter } = useEnterSubmit(handleSubmit)
</script>

<style scoped>
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

/* 两个柔光装饰，呼应首页背景光斑 */
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

/* 下拉框圆角 / 配色与站点按钮、搜索框统一 */
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

/* 字数 / 快捷键提示来自 InputHintBar，发送按钮来自 SubmitButton，与对话页共用 */
.toolbar-actions {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.prompt-input.is-loading :deep(.ant-select-selector) {
  background: #f4f7fc !important;
}

/* <=960px：工具栏换行，避免配置区与字数 / 发送在中间宽度下互相挤压 */
@media (max-width: 960px) {
  .toolbar-config {
    flex: 1 1 100%;
  }

  .toolbar-actions {
    flex: 1 1 100%;
  }
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
    flex: 1 1 100%;
    min-width: 0;
  }

  .config-select {
    width: 100%;
  }

  .toolbar-config {
    flex: 1 1 100%;
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
  浮层由 vc-select 渲染且可能被 Teleport 出组件根节点，因此用 popup-class-name 走非 scoped 样式。
  两个 select 都设 dropdown-match-select-width=false：默认 true 会把浮层宽锁成触发器宽度，模型名一长就被省略号截断。
  样式表里不要写 min-width —— vc-select 会在浮层元素上内联 min-width 且优先级更高，写了不生效，需要下限请用 dropdown-style。
-->
<style>
.prompt-select-dropdown {
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
