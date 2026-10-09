<template>
  <div class="operation-manage-page">
    <PageHeader
      eyebrow="OPERATION MANAGEMENT"
      title="运营管理"
      description="集中管理平台的用户账号、应用与对话历史数据，点击下方标签切换管理模块。"
      :icon="DashboardOutlined"
    />

    <!-- 三个管理模块合到一个菜单下，用标签页切换；当前标签记录在地址栏的 tab 参数里，刷新不丢 -->
    <a-tabs v-model:activeKey="activeTab" class="operation-tabs" @change="syncTabToUrl">
      <a-tab-pane key="user">
        <template #tab>
          <span class="tab-label"><UserAddOutlined />用户管理</span>
        </template>
        <UserManagePanel />
      </a-tab-pane>
      <a-tab-pane key="app">
        <template #tab>
          <span class="tab-label"><AppstoreOutlined />应用管理</span>
        </template>
        <AppManagePanel />
      </a-tab-pane>
      <a-tab-pane key="chatHistory">
        <template #tab>
          <span class="tab-label"><CommentOutlined />对话历史管理</span>
        </template>
        <ChatHistoryManagePanel />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
/**
 * 运营管理页：把原来的用户管理、应用管理、对话管理三个独立页面收进一个菜单，
 * 以标签页方式切换。各模块自身只保留「筛选 + 列表」，页头与标签栏由本页统一提供。
 */
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AppstoreOutlined,
  CommentOutlined,
  DashboardOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import AppManagePanel from './panels/AppManagePanel.vue'
import ChatHistoryManagePanel from './panels/ChatHistoryManagePanel.vue'
import UserManagePanel from './panels/UserManagePanel.vue'

// 标签顺序即页面顺序，默认停在用户管理
const TAB_KEYS = ['user', 'app', 'chatHistory']
const DEFAULT_TAB = 'user'

const route = useRoute()
const router = useRouter()

const isTabKey = (value: unknown): value is string =>
  typeof value === 'string' && TAB_KEYS.includes(value)

/** 地址栏 tab 参数 → 合法标签 key，非法或缺省时回落到默认标签 */
const resolveTab = () => {
  const tab = route.query.tab
  return isTabKey(tab) ? tab : DEFAULT_TAB
}

const activeTab = ref<string>(resolveTab())

// 浏览器前进/后退，以及旧地址（/admin/userManage 等）重定向过来时，跟随地址栏切换标签
watch(
  () => route.query.tab,
  () => {
    const tab = resolveTab()
    if (tab !== activeTab.value) {
      activeTab.value = tab
    }
  },
)

// 切标签只改地址栏参数：用 replace 不往历史里塞记录，返回键仍回到进入运营管理之前的页面
const syncTabToUrl = (key: string | number) => {
  const tab = isTabKey(key) ? key : DEFAULT_TAB
  if (route.query.tab === tab) {
    return
  }
  void router.replace({ query: { ...route.query, tab } })
}
</script>

<style scoped>
.operation-manage-page {
  position: relative;
  display: flex;
  flex-direction: column;

  /* 高度锁死在内容区可视高度内（不是 min-height）：标签内容才能把剩余空间分给列表区域，
     整页不再出现滚动条 —— 超出部分由列表区域自己滚动 */
  height: 100%;
  min-height: 0;
  max-width: 1382px;
  margin: 0 auto;
}

/* 页头高度固定，视口偏矮时也不被压缩；下边距收紧，把高度让给列表区域 */
.operation-manage-page .page-header {
  flex: none;
  margin: 4px 0 18px;
}

.operation-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

/* a-tabs 内部是 nav + content-holder 两层容器，逐层用 flex 撑满并允许压缩后，
   各标签内容才能拿到确定的高度，进而在内部滚动而不是撑高整页 */
.operation-tabs :deep(.ant-tabs-content-holder) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.operation-tabs :deep(.ant-tabs-content) {
  flex: 1;
  min-height: 0;
}

.operation-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

/* 标签栏做成与筛选面板同款的白底圆角卡片 */
.operation-tabs :deep(.ant-tabs-nav) {
  flex: none;
  padding: 6px 8px;
  margin: 0 0 16px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid #edf2fa;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.operation-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: 0;
}

/* 线型下划线在卡片里会压到卡片边框上，故隐藏，选中态改用站点同款浅色渐变胶囊 */
.operation-tabs :deep(.ant-tabs-ink-bar) {
  display: none;
}

.operation-tabs :deep(.ant-tabs-tab) {
  padding: 9px 16px;
  color: #61738d;
  font-size: 14px;
  font-weight: 500;
  border-radius: 10px;
  transition:
    color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
}

.operation-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 6px;
}

.operation-tabs :deep(.ant-tabs-tab:hover) {
  color: #1677ff;
  background: #f3f7ff;
}

.operation-tabs :deep(.ant-tabs-tab-active),
.operation-tabs :deep(.ant-tabs-tab-active:hover) {
  background: linear-gradient(105deg, #eaf2ff, #f1edff);
  box-shadow: inset 0 0 0 1px #dbe7ff;
}

.operation-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #1677ff;
  font-weight: 600;
  text-shadow: none;
}

.operation-tabs :deep(.ant-tabs-tab .anticon) {
  font-size: 15px;
}

/* 标签文案：图标与文字的间距（antd 的 tab 按钮是行内布局，用 gap 比空格更稳） */
.tab-label {
  display: inline-flex;
  gap: 7px;
  align-items: center;
}

/* 窄屏：筛选表单会折成多行、高度不可控，此时恢复「页面整体滚动」，
   避免列表区域被压到只剩一两行 */
@media (max-width: 760px) {
  .operation-manage-page {
    height: auto;
    min-height: 0;
  }

  .operation-tabs :deep(.ant-tabs-content) {
    flex: none;
  }

  .operation-tabs :deep(.ant-tabs-tab) {
    padding: 8px 12px;
  }
}

/* 视口过矮时同理：页头 + 标签栏 + 筛选面板已经吃掉大部分高度，
   再锁死高度会把列表压到几乎看不见，不如退回整页滚动 */
@media (max-height: 640px) {
  .operation-manage-page {
    height: auto;
    min-height: 0;
  }
}
</style>
