<template>
  <div class="app-manage-page">
    <PageHeader
      eyebrow="APPLICATION MANAGEMENT"
      title="应用管理"
      description="查看并管理平台中的所有应用，支持搜索、精选、优先级查看与删除。"
      :icon="AppstoreOutlined"
    />

    <section class="search-panel">
      <div class="panel-label">
        <SearchOutlined />
        <span>筛选应用</span>
      </div>
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
    </section>

    <section class="table-panel">
      <div class="table-heading">
        <div>
          <h2>应用列表</h2>
          <span>共 {{ total }} 个应用</span>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
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
import AppPriorityTag from '@/components/AppPriorityTag.vue'
import CodeGenTypeTag from '@/components/CodeGenTypeTag.vue'
import PageHeader from '@/components/PageHeader.vue'
import { APP_PRIORITY_OPTIONS, GOOD_APP_PRIORITY, MANAGE_PAGE_SIZE } from '@/constant/app'
import { CODE_GEN_TYPE_OPTIONS } from '@/constant/codeGenType'

const router = useRouter()

// 列宽由 table-layout: fixed 精确分配：
// id 列给足 19 位雪花 id 的单行宽度，操作列预留「编辑+取消精选+删除」三个按钮的宽度
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

const dataList = ref<API.AppVO[]>([])
const total = ref(0)
const loading = ref(false)

// 搜索条件
const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: MANAGE_PAGE_SIZE,
})

// 优先级筛选项，null 表示全部（可选项复用应用常量，与编辑页保持一致）
const priorityFilter = ref<number | null>(null)
const priorityOptions = [{ label: '全部', value: null }, ...APP_PRIORITY_OPTIONS]

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

// 删除数据
const doDelete = async (id?: string) => {
  if (!id) {
    return
  }
  const res = await deleteAppByAdmin({ id })
  if (res.data.code === 0) {
    message.success('删除成功').then(() => {})
    // 删除后如果当前页没有数据，则回退一页
    if (dataList.value.length === 1 && (searchParams.pageNum ?? 1) > 1) {
      searchParams.pageNum = (searchParams.pageNum ?? 1) - 1
    }
    await fetchData()
  } else {
    message.error('删除失败，' + res.data.message).then(() => {})
  }
}

// 设置精选（优先级 99）或取消精选
const doUpdatePriority = async (record: API.AppVO, priority: number, tip: string) => {
  if (!record.id) {
    return
  }
  const res = await updateAppByAdmin({ id: record.id, priority })
  if (res.data.code === 0) {
    message.success(tip).then(() => {})
    await fetchData()
  } else {
    message.error('操作失败，' + res.data.message).then(() => {})
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

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const priority = priorityFilter.value === null ? undefined : priorityFilter.value
    const res = await listAppVoByPageByAdmin({
      ...searchParams,
      ...(priority === undefined ? {} : { priority }),
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
.app-manage-page {
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

.priority-select {
  width: 160px;
}

.code-gen-type-select {
  width: 200px;
}

.priority-select :deep(.ant-select-selector),
.code-gen-type-select :deep(.ant-select-selector) {
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

/* 列宽按定义精确分配：id 与操作按钮组都能拿到足够宽度，不会被挤到换行；
   容器过窄时由 .ant-table-content 横向滚动，而不是把内容挤成多行 */
.table-panel :deep(table) {
  width: 100%;
  min-width: 1240px;
  table-layout: fixed;
}

.table-panel :deep(.ant-table-thead > tr > th),
.table-panel :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
}

/* 操作列：按钮组左右各留出内缩间距，不贴单元格边线，也不会溢出被面板裁掉 */
.table-panel :deep(.ant-table-thead > tr > th:last-child),
.table-panel :deep(.ant-table-tbody > tr > td:last-child) {
  padding-right: 20px;
  padding-left: 20px;
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

/* id 列：单行展示（列宽固定，超宽时由 ellipsis 截断） */
.table-panel :deep(.ant-table-tbody > tr > td:first-child) {
  color: #94a3b8;
  font-size: 12px;
}

.table-panel :deep(.ant-pagination) {
  padding: 8px 12px 0;
}

.table-panel :deep(.ant-image) {
  overflow: hidden;
  border: 1px solid #eef3fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(31 73 125 / 8%);
  transition:
    box-shadow 0.25s ease,
    transform 0.25s ease;
}

.table-panel :deep(.ant-image:hover) {
  box-shadow: 0 8px 18px rgb(31 73 125 / 16%);
  transform: translateY(-2px);
}

.table-panel :deep(.ant-image img) {
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

.edit-button {
  color: #1677ff;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.edit-button:hover,
.edit-button:focus {
  color: #fff !important;
  border-color: #1677ff !important;
  background: #1677ff !important;
  box-shadow: 0 6px 14px rgb(22 119 255 / 26%);
}

.good-button {
  color: #b45309;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.good-button:hover,
.good-button:focus {
  color: #fff !important;
  border-color: #f59f4b !important;
  background: #f59f4b !important;
  box-shadow: 0 6px 14px rgb(245 158 11 / 28%);
}

.cancel-good-button {
  color: #64748b;
  background: #fff;
  box-shadow: 0 2px 6px rgb(31 73 125 / 8%);
}

.cancel-good-button:hover,
.cancel-good-button:focus {
  color: #475569 !important;
  border-color: #dbe3ee !important;
  background: #f8fafc !important;
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
  .priority-select,
  .code-gen-type-select {
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
