<template>
  <section class="form-panel" :class="{ 'is-plain': !panel }">
    <slot />
  </section>
</template>

<script setup lang="ts">
/**
 * 表单面板容器：应用编辑页与个人中心页共用面板与控件样式（浅底输入框 / 聚焦描边 /
 * 窄屏把固定栅格改成整行独占）。a-form 由默认插槽传入，其节点带的是页面的 scopeId，
 * 故控件样式写在非 scoped 样式块里，统一以 .form-panel 收敛作用范围。
 */
withDefaults(
  defineProps<{
    /** 关掉后只应用控件样式、不要白色卡片外壳（个人中心页） */
    panel?: boolean
  }>(),
  {
    panel: true,
  },
)
</script>

<style scoped>
.form-panel {
  padding: 32px 28px 12px;
  background: rgb(255 255 255 / 90%);
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.form-panel.is-plain {
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 760px) {
  .form-panel {
    padding: 24px 16px 8px;
  }

  .form-panel.is-plain {
    padding: 0;
  }
}
</style>

<style>
.form-panel .ant-form-item-label > label {
  color: #5e6f88;
  font-size: 13px;
}

.form-panel .ant-input,
.form-panel .ant-input-affix-wrapper,
.form-panel .ant-select .ant-select-selector {
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
}

.form-panel .ant-input:hover,
.form-panel .ant-input-affix-wrapper:hover,
.form-panel .ant-input:focus,
.form-panel .ant-input-affix-wrapper-focused,
.form-panel .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
.form-panel .ant-select-focused .ant-select-selector {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

/* 窄屏标签独占一行、控件铺满整行：固定 4/18 栅格会把输入框压到小于 antd 的固有最小宽度，
   内容被右侧裁掉；antd 的 .ant-col-* 优先级更高，需要 !important。 */
@media (max-width: 640px) {
  .form-panel .ant-form-item-label,
  .form-panel .ant-form-item-control {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
  }

  .form-panel .ant-form-item-label {
    padding-bottom: 4px;
    text-align: left;
  }

  .form-panel .ant-form-item-row {
    flex-wrap: wrap;
  }
}
</style>
