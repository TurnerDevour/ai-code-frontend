<template>
  <div class="chat-manage-page">
    <PageHeader
      eyebrow="CHAT HISTORY MANAGEMENT"
      title="对话管理"
      description="查看平台中的所有对话消息，支持按消息内容、消息类型、应用与用户筛选。"
      :icon="CommentOutlined"
    />

    <section class="search-panel">
      <div class="panel-label">
        <SearchOutlined />
        <span>筛选对话</span>
      </div>
      <a-form class="search-form" layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="消息内容">
          <a-input
            v-model:value="searchParams.message"
            placeholder="输入消息内容"
            allow-clear
            @change="handleSearchChange"
          >
            <template #prefix>
              <MessageOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="消息类型">
          <a-select
            v-model:value="searchParams.messageType"
            class="message-type-select"
            placeholder="全部"
            allow-clear
            :options="CHAT_MESSAGE_TYPE_OPTIONS"
            @change="doSearch"
          />
        </a-form-item>
        <a-form-item label="应用 id">
          <a-input
            v-model:value="searchParams.appId"
            placeholder="输入应用 id"
            allow-clear
            @change="handleSearchChange"
          >
            <template #prefix>
              <AppstoreOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="用户 id">
          <a-input
            v-model:value="searchParams.userId"
            placeholder="输入用户 id"
            allow-clear
            @change="handleSearchChange"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item class="search-action">
          <a-button type="primary" html-type="submit" class="search-button">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
      </a-form>
    </section>

    <section class="table-panel">
      <div class="table-heading">
        <div>
          <h2>对话列表</h2>
          <span>共 {{ total }} 条消息</span>
        </div>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'message'">
            <a-tooltip :title="record.message" placement="topLeft" overlay-class-name="message-tooltip">
              <span class="message-text">{{ record.message }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'messageType'">
            <ChatMessageTypeTag :message-type="record.messageType" />
          </template>
          <template v-else-if="column.dataIndex === 'appId'">
            <a class="app-id-link" @click="goToAppChat(record)">{{ record.appId ?? '-' }}</a>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            <span class="create-time">{{ record.createTime }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="action-buttons">
              <a-button class="chat-button" @click="goToAppChat(record)">
                <MessageOutlined />
                查看对话
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AppstoreOutlined,
  CommentOutlined,
  MessageOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { listAllChatHistoryByPageForAdmin } from '@/api/chatHistoryController'
import ChatMessageTypeTag from '@/components/ChatMessageTypeTag.vue'
import PageHeader from '@/components/PageHeader.vue'
import { MANAGE_PAGE_SIZE } from '@/constant/app'
import { CHAT_MESSAGE_TYPE_OPTIONS } from '@/constant/chat'

const router = useRouter()

// 列宽由 table-layout: fixed 精确分配：
// id / 应用 id 给足 19 位雪花 id 的单行宽度，消息内容列分到最宽并限高 3 行
const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    align: 'center',
    width: 160,
  },
  {
    title: '消息内容',
    dataIndex: 'message',
    align: 'left',
    width: 340,
  },
  {
    title: '消息类型',
    dataIndex: 'messageType',
    align: 'center',
    width: 110,
  },
  {
    title: '应用 id',
    dataIndex: 'appId',
    align: 'center',
    width: 160,
  },
  {
    title: '创建用户 id',
    dataIndex: 'userId',
    align: 'center',
    width: 160,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    align: 'center',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    align: 'center',
    width: 150,
  },
]

const dataList = ref<API.ChatHistory[]>([])
const total = ref(0)
const loading = ref(false)

// 搜索条件
const searchParams = reactive<API.ChatHistoryQueryRequest>({
  pageNum: 1,
  pageSize: MANAGE_PAGE_SIZE,
})

// 分页参数
const pagination = computed(() => ({
  current: searchParams.pageNum ?? 1,
  pageSize: searchParams.pageSize ?? MANAGE_PAGE_SIZE,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 条`,
}))

// 表格变化处理
const doTableChange = (page: { current: number; pageSize: number }) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

// 搜索数据
const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

// 输入框清空时直接刷新
const handleSearchChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.value) {
    doSearch()
  }
}

// 查看对话：跳转到该消息所属应用的对话页（后端暂无删除对话记录的接口，故只提供查看入口）
const goToAppChat = (record: API.ChatHistory) => {
  if (!record.appId) {
    return
  }
  router.push(`/app/chat/${record.appId}`)
}

// id 类条件只在输入为纯数字时才作为查询条件传给后端，避免非数字输入导致请求参数错误
const toIdParam = (value?: string) => {
  const trimmed = (value ?? '').trim()
  return /^\d+$/.test(trimmed) ? trimmed : undefined
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAllChatHistoryByPageForAdmin({
      ...searchParams,
      appId: toIdParam(searchParams.appId),
      userId: toIdParam(searchParams.userId),
    })
    if (res.data.code === 0 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = Number(res.data.data.totalRow ?? 0)
    } else {
      message.error('获取数据失败，' + res.data.message).then(() => {})
    }
  } finally {
    loading.value = false
  }
}

// 页面加载时请求一次
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.chat-manage-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  max-width: 1382px;
  margin: 0 auto;
}

.search-panel,
.table-panel {
  background: rgb(255 255 255 / 88%);
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.search-panel {
  padding: 20px 24px;
  margin-bottom: 22px;
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

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-form :deep(.ant-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

.search-form :deep(.ant-form-item-label > label) {
  color: #5e6f88;
  font-size: 13px;
}

.search-form :deep(.ant-input-affix-wrapper) {
  width: 200px;
  height: 38px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 8px;
  box-shadow: none;
}

.search-form :deep(.ant-input-affix-wrapper:hover),
.search-form :deep(.ant-input-affix-wrapper-focused) {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

.search-form :deep(.ant-input-prefix) {
  margin-right: 8px;
  color: #8da0ba;
}

.message-type-select {
  width: 160px;
}

.message-type-select :deep(.ant-select-selector) {
  height: 38px !important;
  background: #f7f9fc !important;
  border-color: transparent !important;
  border-radius: 8px !important;
}

.search-action {
  margin-left: auto !important;
}

.search-button {
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

.search-button:hover,
.search-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
}

.table-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
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

/* 表格逐层拉满，占满面板的剩余高度（与用户管理页保持一致） */
.table-panel :deep(.ant-table-wrapper) {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0 8px 8px;
}

.table-panel :deep(.ant-spin-nested-loading),
.table-panel :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.table-panel :deep(.ant-table) {
  flex: 1;
  color: #52627a;
  font-size: 13px;
}

/* 列宽按定义精确分配，内容一律单行（仅消息内容列限高 3 行）；
   容器过窄时由 .ant-table-content 横向滚动，而不是把 id 拆成竖排多行 */
.table-panel :deep(table) {
  width: 100%;
  min-width: 1230px;
  table-layout: fixed;
}

.table-panel :deep(.ant-table-thead > tr > th),
.table-panel :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
}

/* 消息内容列：允许换行并最多展示 3 行，完整内容通过 tooltip 查看 */
.table-panel :deep(.ant-table-tbody > tr > td:nth-child(2)) {
  white-space: normal;
}

.table-panel :deep(.ant-table-thead > tr > th) {
  color: #587095;
  font-weight: 600;
  background: #f5f8fd;
  border-bottom: 0;
}

.table-panel :deep(.ant-table-thead > tr > th::before) {
  display: none;
}

.table-panel :deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px;
  border-bottom-color: #eef3fa;
  transition: background 0.2s ease;
}

.table-panel :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fbff !important;
}

.table-panel :deep(.ant-table-tbody > tr > td:first-child) {
  color: #94a3b8;
  font-size: 12px;
}

.table-panel :deep(.ant-pagination) {
  padding: 8px 12px 0;
}

/* 消息内容可能很长：单元格内最多展示 3 行，完整内容通过 tooltip 查看 */
.message-text {
  display: -webkit-box;
  overflow: hidden;
  color: #52627a;
  line-height: 1.6;
  word-break: break-word;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

/* 应用 id：单行展示，过长时省略号截断，不会把列撑破 */
.app-id-link {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: #1677ff;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  cursor: pointer;
  transition: color 0.2s ease;
}

.app-id-link:hover {
  color: #4096ff;
}

.create-time {
  color: #71829a;
  font-variant-numeric: tabular-nums;
}

.action-buttons {
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

.action-buttons :deep(.ant-btn) {
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

.action-buttons :deep(.ant-btn:hover),
.action-buttons :deep(.ant-btn:focus) {
  transform: translateY(-1px);
}

.chat-button {
  color: #1677ff;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.chat-button:hover,
.chat-button:focus {
  color: #fff !important;
  border-color: #1677ff !important;
  background: #1677ff !important;
  box-shadow: 0 6px 14px rgb(22 119 255 / 26%);
}

@media (max-width: 760px) {
  .chat-manage-page {
    min-height: auto;
  }

  .search-panel {
    padding: 18px;
  }

  .search-form {
    display: block;
  }

  .search-form :deep(.ant-form-item) {
    margin-bottom: 14px;
  }

  .search-form :deep(.ant-input-affix-wrapper),
  .message-type-select {
    width: 100%;
  }

  .search-action {
    margin-bottom: 0 !important;
  }

  .search-button {
    width: 100%;
    justify-content: center;
  }

  .table-heading {
    padding: 18px;
  }
}
</style>

<!--
  消息内容 tooltip：浮层由 ant-design-vue 挂到 body 上，scoped 样式命中不了，
  因此用 overlay-class-name 定位，走非 scoped 样式并限制最大高度。
-->
<style>
.message-tooltip {
  max-width: 520px;
  border-radius: 12px;
}

.message-tooltip .ant-tooltip-inner {
  max-height: 220px;
  padding: 10px 14px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.75;
  /* 长消息保留原始换行 */
  white-space: pre-wrap;
  word-break: break-word;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 40%) transparent;
}

.message-tooltip .ant-tooltip-inner::-webkit-scrollbar {
  width: 6px;
}

.message-tooltip .ant-tooltip-inner::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(255 255 255 / 35%);
}

.message-tooltip .ant-tooltip-inner::-webkit-scrollbar-track {
  background: transparent;
}
</style>
