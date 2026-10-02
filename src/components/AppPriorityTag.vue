<template>
  <div class="priority-cell" :class="{ 'is-compact': compact }">
    <a-tooltip :title="`优先级：${normalizedPriority}`">
      <a-tag
        v-if="normalizedPriority === GOOD_APP_PRIORITY"
        class="priority-tag good-tag"
        :bordered="false"
      >
        <StarFilled />
        精选
      </a-tag>
      <a-tag
        v-else-if="normalizedPriority === DEFAULT_APP_PRIORITY"
        class="priority-tag default-tag"
        :bordered="false"
      >
        <HomeOutlined />
        默认应用
      </a-tag>
      <a-tag v-else class="priority-tag custom-tag" :bordered="false">
        <ThunderboltOutlined />
        {{ normalizedPriority }}
      </a-tag>
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HomeOutlined, StarFilled, ThunderboltOutlined } from '@ant-design/icons-vue'
import { DEFAULT_APP_PRIORITY, GOOD_APP_PRIORITY } from '@/constant/app'

const props = withDefaults(
  defineProps<{
    /** 应用优先级，未设置时按默认优先级展示 */
    priority?: number
    /** 紧凑模式：用于弹窗等空间较小的位置 */
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const normalizedPriority = computed(() => props.priority ?? DEFAULT_APP_PRIORITY)
</script>

<style scoped>
.priority-cell {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 96px;
}

.priority-cell.is-compact {
  min-width: 0;
}

.priority-tag {
  position: relative;
  display: inline-flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
  min-width: 82px;
  margin: 0;
  overflow: hidden;
  padding: 3px 10px;
  font-weight: 600;
  font-size: 12px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.priority-cell.is-compact .priority-tag {
  min-width: 0;
  padding: 1px 9px;
  cursor: default;
}

/* 标签为纯状态展示。antd 的点击波纹会把一个零尺寸 holder 作为标签第一个子元素插入，
   而 .priority-tag 是 inline-flex，该 holder 会被当作 flex item 参与居中布局，
   导致波纹圆心落在胶囊右下角。这里直接把 holder 钉在胶囊自身坐标系的原点并铺满整块，
   波纹即可回到标签内、由 overflow 裁切在胶囊圆角内 */
.priority-tag :deep(.ant-wave) {
  position: absolute !important;
  inset: 0 !important;
  margin: 0 !important;
  border-radius: inherit !important;
}

.priority-tag:active {
  transform: translateY(0) scale(0.97);
}

.priority-tag:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.priority-cell.is-compact .priority-tag:hover {
  transform: none;
  filter: none;
}

.good-tag {
  color: #b45309;
  background: linear-gradient(105deg, #fff2df, #ffe6c7);
  box-shadow: inset 0 0 0 1px #ffd9a8;
}

.good-tag:hover {
  box-shadow:
    inset 0 0 0 1px #ffc880,
    0 6px 14px rgb(245 158 11 / 22%);
}

.default-tag {
  color: #47607f;
  background: linear-gradient(105deg, #f2f6fc, #e9f0fa);
  box-shadow: inset 0 0 0 1px #dde8f6;
}

.default-tag:hover {
  box-shadow:
    inset 0 0 0 1px #c8dbf2,
    0 6px 14px rgb(80 120 180 / 18%);
}

.custom-tag {
  color: #0f766e;
  background: linear-gradient(105deg, #e6faf5, #d9f5ee);
  box-shadow: inset 0 0 0 1px #c3ece1;
}

.custom-tag:hover {
  box-shadow:
    inset 0 0 0 1px #a8e2d3,
    0 6px 14px rgb(15 118 110 / 18%);
}
</style>
