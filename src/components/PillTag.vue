<template>
  <a-tag
    class="pill-tag"
    :class="[
      `is-${tone}`,
      { 'is-compact': compact, 'is-interactive': interactive, 'is-clickable': clickable },
    ]"
    :color="antColor"
    :bordered="false"
    :style="pillStyle"
  >
    <slot name="icon">
      <component :is="icon" v-if="icon" class="pill-icon" />
    </slot>
    <slot>{{ label }}</slot>
  </a-tag>
</template>

<script lang="ts">
/**
 * 胶囊标签的通用外壳。
 *
 * 项目里有 5 个「状态胶囊」组件（代码生成类型 / AI 模型 / 消息类型 / 部署状态 / 应用优先级），
 * 它们的内容各不相同，但外壳样式与两个坑完全一样：
 *   1. 圆角胶囊 + inline-flex 居中 + 统一字号字重；
 *   2. antd 的点击波纹会把一个零尺寸 holder 作为标签第一个子元素插入，
 *      在 inline-flex 里它会被当成 flex item 参与居中，导致波纹圆心落在胶囊右下角，
 *      因此需要把 holder 钉在胶囊自身坐标系的原点并铺满整块。
 * 这里把外壳与色板收口，业务标签组件只负责「取名称、选色、选图标」。
 */

/** 胶囊色板：业务标签只需从中挑一个 */
export type PillTagTone =
  | 'plain'
  | 'blue'
  | 'violet'
  | 'teal'
  | 'rose'
  | 'slate'
  | 'good'
  | 'default'
  | 'custom'
</script>

<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 色板 */
    tone?: PillTagTone
    /** 标签文案（也可用默认插槽传入更复杂的内容） */
    label?: string
    /** 左侧图标 */
    icon?: Component
    /** 交给 a-tag 的原生 color（仅 tone=plain 时生效，用于 antd 的预设状态色） */
    antColor?: string
    /** 最小宽度：让同一列里的胶囊宽度对齐 */
    minWidth?: number | string
    /** 紧凑模式：去掉最小宽度、缩小内边距，并关闭悬浮反馈 */
    compact?: boolean
    /** 是否有点击态（cursor: pointer） */
    interactive?: boolean
    /** 仅需要「可点击」的手型光标、不需要悬浮上浮效果时使用 */
    clickable?: boolean
  }>(),
  {
    tone: 'plain',
    compact: false,
    interactive: false,
    clickable: false,
  },
)

const pillStyle = computed(() => {
  if (props.compact || props.minWidth === undefined) {
    return undefined
  }
  return { minWidth: typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth }
})
</script>

<style scoped>
.pill-tag {
  display: inline-flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 3px 10px;
  font-weight: 600;
  font-size: 12px;
  border: 0;
  border-radius: 999px;
}

.pill-icon {
  font-size: 11px;
  opacity: 0.85;
}

/* 状态展示类胶囊：悬浮时轻微上浮，点击时轻微回弹 */
.pill-tag.is-interactive {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.pill-tag.is-interactive:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.pill-tag.is-interactive:active {
  transform: translateY(0) scale(0.97);
}

.pill-tag.is-compact {
  min-width: 0;
  padding: 1px 9px;
  cursor: default;
}

.pill-tag.is-clickable {
  cursor: pointer;
}

.pill-tag.is-compact:hover,
.pill-tag.is-compact:active {
  transform: none;
  filter: none;
}

/* 见组件顶部注释 2：把 antd 的波纹 holder 拉回胶囊自身坐标系 */
.pill-tag :deep(.ant-wave) {
  position: absolute !important;
  inset: 0 !important;
  margin: 0 !important;
  border-radius: inherit !important;
}

/* ---- 色板 ---- */
.pill-tag.is-blue {
  color: #1677ff;
  background: #eaf3ff;
  box-shadow: inset 0 0 0 1px #d8e8ff;
}

.pill-tag.is-violet {
  color: #7c3aed;
  background: #f3ecff;
  box-shadow: inset 0 0 0 1px #e4d8ff;
}

.pill-tag.is-teal {
  color: #0f766e;
  background: #e8faf4;
  box-shadow: inset 0 0 0 1px #c3ece1;
}

.pill-tag.is-rose {
  color: #e85d75;
  background: #fff2f4;
  box-shadow: inset 0 0 0 1px #ffd8df;
}

.pill-tag.is-slate {
  color: #64748b;
  background: #f5f8fd;
  box-shadow: inset 0 0 0 1px #e2eaf5;
}

.pill-tag.is-good {
  color: #b45309;
  background: linear-gradient(105deg, #fff2df, #ffe6c7);
  box-shadow: inset 0 0 0 1px #ffd9a8;
}

.pill-tag.is-good.is-interactive:hover {
  box-shadow:
    inset 0 0 0 1px #ffc880,
    0 6px 14px rgb(245 158 11 / 22%);
}

.pill-tag.is-default {
  color: #47607f;
  background: linear-gradient(105deg, #f2f6fc, #e9f0fa);
  box-shadow: inset 0 0 0 1px #dde8f6;
}

.pill-tag.is-default.is-interactive:hover {
  box-shadow:
    inset 0 0 0 1px #c8dbf2,
    0 6px 14px rgb(80 120 180 / 18%);
}

.pill-tag.is-custom {
  color: #0f766e;
  background: linear-gradient(105deg, #e6faf5, #d9f5ee);
  box-shadow: inset 0 0 0 1px #c3ece1;
}

.pill-tag.is-custom.is-interactive:hover {
  box-shadow:
    inset 0 0 0 1px #a8e2d3,
    0 6px 14px rgb(15 118 110 / 18%);
}
</style>
