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
            <a-tooltip :title="record.message" placement="topLeft">
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

// 列宽使用百分比，配合 table-layout: fixed 保证表格始终适配容器宽度，不出现横向滚动条
const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    align: 'center',
    width: '14%',
  },
  {
    title: '消息内容',
    dataIndex: 'message',
    align: 'center',
    width: '24%',
  },
  {
    title: '消息类型',
    dataIndex: 'messageType',
    align: 'center',
    width: '11%',
  },
  {
    title: '应用 id',
    dataIndex: 'appId',
    align: 'center',
    width: '13%',
  },
  {
    title: '创建用户 id',
    dataIndex: 'userId',
    align: 'center',
    width: '13%',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    align: 'center',
    width: '14%',
  },
  {
    title: '操作',
    key: 'action',
    align: 'center',
    width: '11%',
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

/* 列宽自适应容器宽度、长内容换行，避免出现横向滚动条 */
.table-panel :deep(.ant-table-content) {
  overflow-x: hidden;
}

.table-panel :deep(table) {
  width: 100%;
  table-layout: fixed;
}

.table-panel :deep(.ant-table-thead > tr > th),
.table-panel :deep(.ant-table-tbody > tr > td) {
  word-break: break-word;
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

/* 消息内容可能很长，单元格内只展示一行，完整内容通过 tooltip 查看 */
.message-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: #52627a;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.app-id-link {
  color: #1677ff;
  font-weight: 600;
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
  flex-wrap: wrap;
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
  gap: 4px;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  font-size: 12px;
  font-weight: 600;
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
