<template>
  <a-modal
    :open="open"
    :width="width"
    :centered="centered"
    :footer="null"
    :mask-closable="maskClosable"
    wrap-class-name="app-modal"
    @update:open="handleOpenChange"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="app-modal-title">
        <div class="app-modal-title-icon">
          <component :is="icon" v-if="icon" />
        </div>
        <div class="app-modal-title-text">
          <span class="app-modal-title-main">{{ title }}</span>
          <span v-if="subtitle" class="app-modal-title-sub">{{ subtitle }}</span>
        </div>
      </div>
    </template>

    <div class="app-modal-body">
      <slot />
    </div>

    <div class="app-modal-footer">
      <slot name="footer">
        <a-button class="app-modal-button ghost-button" @click="handleCancel">
          {{ cancelText }}
        </a-button>
        <a-button
          v-if="showConfirm"
          class="app-modal-button primary-button"
          :type="confirmDanger ? 'default' : 'primary'"
          :danger="confirmDanger"
          :loading="confirmLoading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </a-button>
      </slot>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    /** 是否显示，配合 v-model:open 使用 */
    open?: boolean
    /** 标题 */
    title?: string
    /** 标题下方说明文字 */
    subtitle?: string
    /** 标题图标 */
    icon?: Component
    /** 宽度 */
    width?: number | string
    /** 是否垂直居中 */
    centered?: boolean
    /** 点击遮罩是否可关闭 */
    maskClosable?: boolean
    /** 是否展示底部默认确定按钮 */
    showConfirm?: boolean
    /** 确定按钮文案 */
    confirmText?: string
    /** 取消按钮文案 */
    cancelText?: string
    /** 确定按钮 loading */
    confirmLoading?: boolean
    /** 确定按钮是否为危险操作（红色） */
    confirmDanger?: boolean
  }>(),
  {
    open: false,
    title: '',
    width: 460,
    centered: true,
    maskClosable: false,
    showConfirm: true,
    confirmText: '确定',
    cancelText: '取消',
    confirmLoading: false,
    confirmDanger: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
}

const handleCancel = () => {
  emit('update:open', false)
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<!-- 弹窗会被 teleport 到 body，作用域选择器无法命中内部节点，因此统一使用 :global -->
<style scoped>
:global(.app-modal .ant-modal-content) {
  padding: 0;
  overflow: hidden;
  border-radius: 18px;
  box-shadow: 0 24px 60px rgb(31 73 125 / 18%);
}

:global(.app-modal .ant-modal-header) {
  padding: 18px 24px;
  margin: 0;
  border-bottom: 1px solid #eef3fa;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
}

:global(.app-modal .ant-modal-close) {
  top: 20px;
  right: 20px;
  color: #8190a5;
  border-radius: 8px;
}

:global(.app-modal .ant-modal-close:hover) {
  color: #1677ff;
  background: rgb(22 119 255 / 8%);
}

:global(.app-modal .app-modal-title) {
  display: flex;
  gap: 10px;
  align-items: center;
}

:global(.app-modal .app-modal-title-icon) {
  display: grid;
  width: 30px;
  height: 30px;
  color: #fff;
  font-size: 15px;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 6px 14px rgb(54 103 210 / 22%);
}

:global(.app-modal .app-modal-title-text) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

:global(.app-modal .app-modal-title-main) {
  color: #172b4d;
  font-weight: 700;
  font-size: 16px;
  line-height: 1.3;
}

:global(.app-modal .app-modal-title-sub) {
  color: #8190a5;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.4;
}

:global(.app-modal .ant-modal-body) {
  padding: 20px 24px 22px;
}

:global(.app-modal .app-modal-body) {
  color: #3c5677;
  font-size: 13px;
  line-height: 1.7;
}

:global(.app-modal .app-modal-footer) {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 18px;
  margin-top: 20px;
  border-top: 1px solid #eef3fa;
}

:global(.app-modal .app-modal-footer .ant-btn) {
  display: inline-flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  height: 38px;
  padding: 0 18px;
  font-weight: 600;
  font-size: 13px;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

:global(.app-modal .app-modal-footer .ant-btn:hover) {
  transform: translateY(-1px);
}

:global(.app-modal .ghost-button) {
  color: #5c6d86;
  border-color: #e6eefb;
  background: #f7f9fc;
}

:global(.app-modal .ghost-button:hover),
:global(.app-modal .ghost-button:focus) {
  color: #1677ff !important;
  border-color: #bfdbfe !important;
  background: #eef5ff !important;
}

:global(.app-modal .primary-button) {
  color: #fff;
  border: 0;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 8px 18px rgb(40 96 224 / 24%);
}

:global(.app-modal .primary-button:hover),
:global(.app-modal .primary-button:focus) {
  color: #fff !important;
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
  box-shadow: 0 10px 22px rgb(40 96 224 / 30%);
}

/* 表单类内容在弹窗内的统一样式 */
:global(.app-modal .ant-input),
:global(.app-modal .ant-input-affix-wrapper) {
  border-radius: 10px;
}

:global(.app-modal .ant-input::placeholder) {
  color: #9eabc0;
}
</style>
