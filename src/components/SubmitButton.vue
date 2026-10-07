<template>
  <button
    type="button"
    class="submit-icon-button"
    :class="`is-${size}`"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <LoadingOutlined v-if="loading" />
    <slot>
      <ArrowUpOutlined />
    </slot>
  </button>
</template>

<script setup lang="ts">
/**
 * 圆形的「发送 / 提交」渐变按钮。
 *
 * 首页提示词输入框与对话页输入框各写了一份同样的按钮：品牌渐变底、
 * 加载中换成 LoadingOutlined、禁用时半透明，只有直径差 2px。
 * 这里以 size 区分，两处共用。
 */
import { ArrowUpOutlined, LoadingOutlined } from '@ant-design/icons-vue'

withDefaults(
  defineProps<{
    /** 是否处于加载中（图标换成旋转 loading） */
    loading?: boolean
    /** 是否禁用 */
    disabled?: boolean
    /** 尺寸：md 用于首页大输入框，sm 用于对话页工具条 */
    size?: 'md' | 'sm'
  }>(),
  {
    loading: false,
    disabled: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<style scoped>
.submit-icon-button {
  display: grid;
  flex: 0 0 auto;
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

.submit-icon-button.is-sm {
  width: 36px;
  height: 36px;
  font-size: 16px;
  box-shadow: 0 8px 16px rgb(54 103 210 / 26%);
}

.submit-icon-button:hover:not(:disabled) {
  box-shadow: 0 10px 22px rgb(54 103 210 / 34%);
  transform: translateY(-1px);
}

.submit-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}
</style>
