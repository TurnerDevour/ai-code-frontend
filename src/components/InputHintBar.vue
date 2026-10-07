<template>
  <span class="input-hint-bar" :class="{ 'is-hint-mobile-hidden': hideHintOnMobile }">
    <span class="hint-counter" :class="{ 'is-limit': isAtLimit }"
      >{{ length }} / {{ maxlength }}</span
    >
    <span v-if="showHint" class="hint-tips">
      <kbd class="hint-key">Enter</kbd>
      发送
      <span class="hint-divider"></span>
      <kbd class="hint-key">Shift</kbd>
      +
      <kbd class="hint-key">Enter</kbd>
      换行
    </span>
  </span>
</template>

<script setup lang="ts">
/**
 * 输入框右下角的「字数计数 + 快捷键提示」。
 *
 * 首页提示词输入框与对话页输入框此前各写了一份完全相同的结构与样式
 * （计数、上限警示色、Enter / Shift+Enter 提示、kbd 胶囊），这里合并成一个组件。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 当前已输入字符数 */
    length: number
    /** 字符数上限 */
    maxlength: number
    /** 是否展示快捷键提示 */
    showHint?: boolean
    /** 窄屏（<=760px）时隐藏快捷键提示，默认否 */
    hideHintOnMobile?: boolean
  }>(),
  {
    showHint: true,
    hideHintOnMobile: false,
  },
)

/** 达到上限后计数转为警示色 */
const isAtLimit = computed(() => props.length >= props.maxlength)
</script>

<style scoped>
.input-hint-bar {
  display: inline-flex;
  gap: 12px;
  align-items: center;
}

.hint-counter {
  color: #a3b1c4;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.hint-counter.is-limit {
  color: #e85d75;
  font-weight: 600;
}

.hint-tips {
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

@media (max-width: 760px) {
  .input-hint-bar.is-hint-mobile-hidden .hint-tips {
    display: none;
  }
}
</style>
