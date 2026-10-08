<template>
  <a-popconfirm
    title="确定要删除该应用吗？删除后不可恢复"
    ok-text="确定"
    cancel-text="取消"
    placement="topRight"
    @confirm="emit('confirm')"
  >
    <slot />
  </a-popconfirm>
</template>

<script setup lang="ts">
/**
 * 「删除应用」的二次确认容器：首页卡片与应用详情弹窗共用，避免破坏性提示的文案改一处漏一处。
 * 触发按钮由使用方通过默认插槽传入（首页卡片是 `.card-action`，弹窗是 `.app-modal-button`），样式留在各自宿主里，这样仍能吃到宿主的 scoped 样式。
 */
const emit = defineEmits<{
  (e: 'confirm'): void
}>()
</script>
