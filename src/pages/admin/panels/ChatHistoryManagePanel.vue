<template>
  <div class="chat-manage-panel">
    <AdminSearchPanel label="筛选对话">
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
    </AdminSearchPanel>

    <AdminTablePanel title="对话列表" :total="total" unit="条消息" :min-table-width="1230">
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
            <a-tooltip
              :title="record.message"
              placement="topLeft"
              overlay-class-name="message-tooltip"
            >
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
    </AdminTablePanel>
  </div>
</template>

<script setup lang="ts">
/**
 * 运营管理 - 对话历史管理页签的内容：筛选面板 + 全平台对话消息表格。
 * 页头由 OperationManagePage 统一提供，这里只负责该页签的数据与交互。
 */
import { useRouter } from 'vue-router'
import {
  AppstoreOutlined,
  MessageOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { listAllChatHistoryByPageForAdmin } from '@/api/chatHistoryController'
import AdminSearchPanel from '@/components/AdminSearchPanel.vue'
import AdminTablePanel from '@/components/AdminTablePanel.vue'
import ChatMessageTypeTag from '@/components/ChatMessageTypeTag.vue'
import { usePagedQuery } from '@/composables/usePagedQuery'
import { MANAGE_PAGE_SIZE } from '@/constant/app'
import { CHAT_MESSAGE_TYPE_OPTIONS } from '@/constant/chat'

const router = useRouter()

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

const toIdParam = (value?: string) => {
  const trimmed = (value ?? '').trim()
  return /^\d+$/.test(trimmed) ? trimmed : undefined
}

const {
  dataList,
  total,
  loading,
  query: searchParams,
  pagination,
  search: doSearch,
  changePage: doTableChange,
  handleInputClear: handleSearchChange,
} = usePagedQuery<API.ChatHistory, API.ChatHistoryQueryRequest>({
  initialQuery: { pageNum: 1, pageSize: MANAGE_PAGE_SIZE },
  pageSize: MANAGE_PAGE_SIZE,
  fetchPage: (query) =>
    listAllChatHistoryByPageForAdmin({
      ...query,
      appId: toIdParam(query.appId),
      userId: toIdParam(query.userId),
    }),
})

// 查看对话：跳转到该消息所属应用的对话页（后端暂无删除对话记录的接口，故只提供查看入口）
const goToAppChat = (record: API.ChatHistory) => {
  if (!record.appId) {
    return
  }
  router.push(`/app/chat/${record.appId}`)
}
</script>

<style scoped>
.chat-manage-panel {
  position: relative;
  display: flex;
  flex-direction: column;

  /* 高度由运营管理页逐层约束后透下来：高度占满标签页，剩余空间全部给列表区域 */
  height: 100%;
  min-height: 0;
}

.chat-manage-panel :deep(.ant-table-tbody > tr > td:nth-child(2)) {
  white-space: normal;
}

.message-type-select {
  width: 160px;
}

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

@media (max-width: 760px) {
  .chat-manage-panel {
    height: auto;
  }
}
</style>

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
