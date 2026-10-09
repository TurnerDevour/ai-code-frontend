<template>
  <section class="admin-search-panel">
    <div class="panel-label">
      <SearchOutlined />
      <span>{{ label }}</span>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/**
 * 后台管理页的「筛选面板」外壳：用户 / 应用 / 对话三个页面共用面板容器、
 * 「筛选 XX」小标题与内部 antd 控件样式，表单项由默认插槽传入。
 */
import { SearchOutlined } from '@ant-design/icons-vue'

defineProps<{
  label: string
}>()
</script>

<style scoped>
.admin-search-panel {
  /* flex: none：作为纵向 flex 项时高度按内容固定，不被下方的列表区域挤压 */
  flex: none;
  padding: 16px 24px;
  margin-bottom: 16px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.panel-label {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  color: #48658b;
  font-weight: 600;
  font-size: 14px;
}

.panel-label :deep(.anticon) {
  color: #1677ff;
}
</style>

<!-- 表单由页面通过插槽传入，其节点带的是页面的 scopeId，面板的 scoped 样式命中不了，
     故搜索表单与内部 antd 控件的样式放在非 scoped 块里，用 .admin-search-panel 收敛范围。 -->
<style>
.admin-search-panel .search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.admin-search-panel .search-form .ant-form-item {
  margin-right: 0;
  margin-bottom: 0;
}

.admin-search-panel .search-form .ant-form-item-label > label {
  color: #5e6f88;
  font-size: 13px;
}

.admin-search-panel .search-form .ant-input-affix-wrapper {
  width: 200px;
  height: 38px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 8px;
  box-shadow: none;
}

.admin-search-panel .search-form .ant-input-affix-wrapper:hover,
.admin-search-panel .search-form .ant-input-affix-wrapper-focused {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

.admin-search-panel .search-form .ant-input-prefix {
  margin-right: 8px;
  color: #8da0ba;
}

/* 下拉框与输入框同高同底色；antd 的 select 默认样式优先级更高，需 !important 才能覆盖 */
.admin-search-panel .search-form .ant-select-selector {
  height: 38px !important;
  background: #f7f9fc !important;
  border-color: transparent !important;
  border-radius: 8px !important;
}

.admin-search-panel .search-action {
  margin-left: auto !important;
}

.admin-search-panel .search-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 38px;
  padding: 0 18px;
  font-weight: 600;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 7px 15px rgb(40 96 224 / 20%);
}

.admin-search-panel .search-button:hover,
.admin-search-panel .search-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
}

@media (max-width: 760px) {
  .admin-search-panel {
    padding: 18px;
  }

  .admin-search-panel .search-form {
    display: block;
  }

  .admin-search-panel .search-form .ant-form-item {
    margin-bottom: 14px;
  }

  /* 窄屏：输入框与下拉框铺满整行 */
  .admin-search-panel .search-form .ant-input-affix-wrapper,
  .admin-search-panel .search-form .ant-select {
    width: 100%;
  }

  .admin-search-panel .search-action {
    margin-bottom: 0 !important;
  }

  .admin-search-panel .search-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
