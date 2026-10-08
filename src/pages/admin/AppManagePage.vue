<template>
  <div class="app-manage-page">
    <PageHeader
      eyebrow="APPLICATION MANAGEMENT"
      title="应用管理"
      description="查看并管理平台中的所有应用，支持搜索、精选、优先级查看与删除。"
      :icon="AppstoreOutlined"
    />

    <AdminSearchPanel label="筛选应用">
      <a-form class="search-form" layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="应用名称">
          <a-input
            v-model:value="searchParams.appName"
            placeholder="输入应用名称"
            allow-clear
            @change="handleSearchChange"
          >
            <template #prefix>
              <AppstoreOutlined />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="代码生成类型">
          <a-select
            v-model:value="searchParams.codeGenType"
            class="code-gen-type-select"
            placeholder="全部"
            allow-clear
            :options="CODE_GEN_TYPE_OPTIONS"
            @change="doSearch"
          />
        </a-form-item>
        <a-form-item label="优先级">
          <a-select
            v-model:value="priorityFilter"
            class="priority-select"
            :options="priorityOptions"
            @change="doSearch"
          />
        </a-form-item>
        <a-form-item class="search-action">
          <a-button type="primary" html-type="submit" class="search-button">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
      </a-form>
    </AdminSearchPanel>

    <AdminTablePanel title="应用列表" :total="total" unit="个应用" :min-table-width="1240">
      <a-table
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'appName'">
            <a class="app-name-link" @click="goToAppDetail(record)">{{ record.appName }}</a>
          </template>
          <template v-else-if="column.dataIndex === 'cover'">
            <a-image v-if="record.cover" :src="record.cover" :width="72" :height="46" />
            <span v-else class="empty-cover">
              <PictureOutlined />
              暂无封面
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'codeGenType'">
            <CodeGenTypeTag :code-gen-type="record.codeGenType" />
          </template>
          <template v-else-if="column.dataIndex === 'priority'">
            <AppPriorityTag :priority="record.priority" />
          </template>
          <template v-else-if="column.dataIndex === 'user'">
            <div class="user-cell">
              <a-avatar :size="28" :src="record.user?.userAvatar">
                <template #icon>
                  <UserOutlined />
                </template>
              </a-avatar>
              <span>{{ record.user?.username ?? '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            <span class="create-time">{{ record.createTime }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="action-buttons">
              <a-button class="edit-button" @click="goToEditPage(record)">
                <EditOutlined />
                编辑
              </a-button>
              <a-button
                v-if="record.priority === GOOD_APP_PRIORITY"
                class="cancel-good-button"
                @click="doUpdatePriority(record, 0, '已取消精选')"
              >
                <StarOutlined />
                取消精选
              </a-button>
              <a-button
                v-else
                class="good-button"
                @click="doUpdatePriority(record, GOOD_APP_PRIORITY, '已设为精选')"
              >
                <StarFilled />
                精选
              </a-button>
              <a-popconfirm
                title="确定要删除该应用吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="doDelete(record.id)"
              >
                <a-button danger class="delete-button">
                  <DeleteOutlined />
                  删除
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </AdminTablePanel>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { deleteAppByAdmin, listAppVoByPageByAdmin, updateAppByAdmin } from '@/api/appController'
import AdminSearchPanel from '@/components/AdminSearchPanel.vue'
import AdminTablePanel from '@/components/AdminTablePanel.vue'
import AppPriorityTag from '@/components/AppPriorityTag.vue'
import CodeGenTypeTag from '@/components/CodeGenTypeTag.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMessage } from '@/composables/useMessage'
import { usePagedQuery } from '@/composables/usePagedQuery'
import { APP_PRIORITY_OPTIONS, GOOD_APP_PRIORITY, MANAGE_PAGE_SIZE } from '@/constant/app'
import { CODE_GEN_TYPE_OPTIONS } from '@/constant/codeGenType'

const router = useRouter()
const { handle: handleResponse } = useMessage()

// 列宽由 table-layout: fixed 精确分配：id 列容下 19 位雪花 id，操作列容下三个按钮
const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    align: 'center',
    width: 150,
  },
  {
    title: '应用名称',
    dataIndex: 'appName',
    align: 'center',
    width: '14%',
  },
  {
    title: '应用封面',
    dataIndex: 'cover',
    align: 'center',
    width: '8%',
  },
  {
    title: '生成类型',
    dataIndex: 'codeGenType',
    align: 'center',
    width: '10%',
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    align: 'center',
    width: '9%',
  },
  {
    title: '创建用户',
    dataIndex: 'user',
    align: 'center',
    width: '12%',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    align: 'center',
    width: '12%',
  },
  {
    title: '操作',
    key: 'action',
    align: 'center',
    width: '22%',
  },
]

// 优先级筛选项，null 表示全部（选项复用应用常量，与编辑页一致）
const priorityFilter = ref<number | null>(null)
const priorityOptions = [{ label: '全部', value: null }, ...APP_PRIORITY_OPTIONS]

const {
  dataList,
  total,
  loading,
  query: searchParams,
  pagination,
  load: fetchData,
  search: doSearch,
  changePage: doTableChange,
  handleInputClear: handleSearchChange,
  reloadAfterRemove,
} = usePagedQuery<API.AppVO, API.AppQueryRequest>({
  initialQuery: { pageNum: 1, pageSize: MANAGE_PAGE_SIZE },
  pageSize: MANAGE_PAGE_SIZE,
  fetchPage: (query) => {
    const priority = priorityFilter.value === null ? undefined : priorityFilter.value
    return listAppVoByPageByAdmin({
      ...query,
      ...(priority === undefined ? {} : { priority }),
    })
  },
})

// 删除数据
const doDelete = async (id?: string) => {
  if (!id) {
    return
  }
  const res = await deleteAppByAdmin({ id })
  if (handleResponse(res, { success: '删除成功', fail: '删除失败' })) {
    // 本地先摘掉这一行，再重拉一页校准；当前页空了会自动回退一页
    await reloadAfterRemove(id)
  }
}

// 设置精选（优先级 99）或取消精选
const doUpdatePriority = async (record: API.AppVO, priority: number, tip: string) => {
  if (!record.id) {
    return
  }
  const res = await updateAppByAdmin({ id: record.id, priority })
  if (handleResponse(res, { success: tip, fail: '操作失败' })) {
    await fetchData()
  }
}

const goToEditPage = (record: API.AppVO) => {
  router.push(`/admin/appEdit/${record.id}`)
}

// 查看对话：进入应用对话页，展示该应用的对话历史与生成结果
const goToAppDetail = (record: API.AppVO) => {
  router.push({
    path: `/app/chat/${record.id}`,
  })
}
</script>

<style scoped>
.app-manage-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  max-width: 1382px;
  margin: 0 auto;
}

.priority-select {
  width: 160px;
}

.code-gen-type-select {
  width: 200px;
}

.app-manage-page :deep(.ant-table-thead > tr > th:last-child),
.app-manage-page :deep(.ant-table-tbody > tr > td:last-child) {
  padding-right: 20px;
  padding-left: 20px;
}

.app-manage-page :deep(.ant-image) {
  overflow: hidden;
  border: 1px solid #eef3fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(31 73 125 / 8%);
  transition:
    box-shadow 0.25s ease,
    transform 0.25s ease;
}

.app-manage-page :deep(.ant-image:hover) {
  box-shadow: 0 8px 18px rgb(31 73 125 / 16%);
  transform: translateY(-2px);
}

.app-manage-page :deep(.ant-image img) {
  object-fit: cover;
  object-position: top center;
}

.app-name-link {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  color: #1677ff;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  cursor: pointer;
  transition: color 0.2s ease;
}

.app-name-link:hover {
  color: #4096ff;
}

.empty-cover {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 5px;
  align-items: center;
  padding: 2px 10px;
  color: #a3b1c4;
  font-size: 12px;
  border: 1px dashed #e2eaf5;
  border-radius: 999px;
  background: #fafcff;
}

.user-cell {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  max-width: 160px;
  padding: 3px 12px 3px 4px;
  overflow: hidden;
  color: #3c5677;
  font-weight: 500;
  border: 1px solid #eef3fa;
  border-radius: 999px;
  background: #f8fbff;
}

.user-cell > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-cell :deep(.ant-avatar) {
  border: 1px solid #e6eefb;
}

.delete-button {
  color: #e85d75;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.delete-button:hover,
.delete-button:focus {
  color: #fff !important;
  border-color: #f0667c !important;
  background: #f0667c !important;
  box-shadow: 0 6px 14px rgb(240 102 124 / 28%);
}

@media (max-width: 760px) {
  .app-manage-page {
    min-height: auto;
  }
}
</style>
