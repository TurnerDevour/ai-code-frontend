<template>
  <section
    class="admin-table-panel"
    :class="{ 'is-fixed-layout': minTableWidth !== undefined }"
    :style="minWidthStyle"
  >
    <div class="table-heading">
      <div>
        <h2>{{ title }}</h2>
        <span>共 {{ total }} {{ unit }}</span>
      </div>
      <slot name="heading-extra" />
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/**
 * 后台管理页的「表格面板」外壳。
 *
 * 用户 / 应用 / 对话三个管理页的表格面板此前各自复制了同一段结构和同一套
 * 「面板 + 表头 + 表体 + 分页 + 操作按钮组」样式（每个页面 150 行左右），
 * 差异只有标题文案、总数单位和表格最小宽度，因此收成一个面板组件，
 * a-table 由默认插槽传入，各页面保留自己的列定义与单元格渲染。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 面板标题，如「应用列表」 */
    title: string
    /** 总条数 */
    total: number
    /** 总数单位，如「个应用」「条消息」 */
    unit?: string
    /** 表格最小宽度：列多时由容器横向滚动，而不是把内容挤成多行 */
    minTableWidth?: number | string
  }>(),
  {
    unit: '条',
  },
)

const minWidthStyle = computed(() => {
  if (props.minTableWidth === undefined) {
    return undefined
  }
  const width =
    typeof props.minTableWidth === 'number' ? `${props.minTableWidth}px` : props.minTableWidth
  // 通过 CSS 变量透给非 scoped 的表格样式
  return { '--admin-table-min-width': width }
})
</script>

<style scoped>
.admin-table-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: rgb(255 255 255 / 88%);
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.table-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 15px;
}

.table-heading h2 {
  margin: 0 0 3px;
  color: #172b4d;
  font-size: 17px;
  line-height: 1.4;
}

.table-heading span {
  color: #8190a5;
  font-size: 13px;
}
</style>

<!--
  a-table 由页面通过插槽传入，面板的 scoped 样式无法命中它的内部节点，
  因此表格本体、分页与操作按钮组的样式放在非 scoped 样式块里，
  统一用 .admin-table-panel 收敛作用范围；表格最小宽度由 CSS 变量从组件透下来。
-->
<style>
.admin-table-panel .ant-table-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0 8px 8px;
}

.admin-table-panel .ant-spin-nested-loading,
.admin-table-panel .ant-spin-container {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.admin-table-panel .ant-table {
  flex: 1;
  color: #52627a;
  font-size: 13px;
}

/* 列宽按定义精确分配（仅声明了 minTableWidth 的页面），容器过窄时由 .ant-table-content 横向滚动；
   未声明列宽的页面保持浏览器默认的自动布局，避免把列宽拉成均分 */
.admin-table-panel table {
  width: 100%;
  min-width: var(--admin-table-min-width, 0);
}

.admin-table-panel.is-fixed-layout table {
  table-layout: fixed;
}

.admin-table-panel .ant-table-thead > tr > th,
.admin-table-panel .ant-table-tbody > tr > td {
  white-space: nowrap;
}

.admin-table-panel .ant-table-thead > tr > th {
  color: #587095;
  font-weight: 600;
  background: #f5f8fd;
  border-bottom: 0;
}

.admin-table-panel .ant-table-thead > tr > th::before {
  display: none;
}

.admin-table-panel .ant-table-tbody > tr > td {
  padding: 12px 16px;
  border-bottom-color: #eef3fa;
  transition: background 0.2s ease;
}

.admin-table-panel .ant-table-tbody > tr:hover > td {
  background: #f8fbff !important;
}

/* 首列基本是雪花 id：弱化展示，避免抢视觉 */
.admin-table-panel .ant-table-tbody > tr > td:first-child {
  color: #94a3b8;
  font-size: 12px;
}

.admin-table-panel .ant-pagination {
  padding: 8px 12px 0;
}

/* 创建时间：等宽数字，多行对齐 */
.admin-table-panel .create-time {
  color: #71829a;
  font-variant-numeric: tabular-nums;
}

/* ---- 操作列按钮组 ---- */
.admin-table-panel .action-buttons {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 6px;
  justify-content: center;
  align-items: center;
  padding: 4px;
  background: #f5f8fd;
  border: 1px solid #eef3fa;
  border-radius: 12px;
}

.admin-table-panel .action-buttons .ant-btn {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border-color: transparent;
  border-radius: 8px;
  box-shadow: none;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.admin-table-panel .action-buttons .ant-btn:hover,
.admin-table-panel .action-buttons .ant-btn:focus {
  transform: translateY(-1px);
}

/* 操作列按钮：白底描边胶囊，悬浮时填充对应主题色 */
.admin-table-panel .edit-button,
.admin-table-panel .chat-button {
  color: #1677ff;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.admin-table-panel .edit-button:hover,
.admin-table-panel .edit-button:focus,
.admin-table-panel .chat-button:hover,
.admin-table-panel .chat-button:focus {
  color: #fff !important;
  border-color: #1677ff !important;
  background: #1677ff !important;
  box-shadow: 0 6px 14px rgb(22 119 255 / 26%);
}

.admin-table-panel .good-button {
  color: #b45309;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.admin-table-panel .good-button:hover,
.admin-table-panel .good-button:focus {
  color: #fff !important;
  border-color: #f59f4b !important;
  background: #f59f4b !important;
  box-shadow: 0 6px 14px rgb(245 158 11 / 28%);
}

.admin-table-panel .cancel-good-button {
  color: #64748b;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.admin-table-panel .cancel-good-button:hover,
.admin-table-panel .cancel-good-button:focus {
  color: #475569 !important;
  border-color: #dbe3ee !important;
  background: #f8fafc !important;
}

@media (max-width: 760px) {
  .admin-table-panel .table-heading {
    padding: 18px;
  }
}
</style>
