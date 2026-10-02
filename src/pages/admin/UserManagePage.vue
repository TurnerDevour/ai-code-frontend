<template>
  <div class="user-manage-page">
    <PageHeader
      eyebrow="USER MANAGEMENT"
      title="用户管理"
      description="查看并管理平台中的用户账号与权限。"
      :icon="TeamOutlined"
    />

    <section class="search-panel">
      <div class="panel-label">
        <SearchOutlined />
        <span>筛选用户</span>
      </div>
      <a-form class="search-form" layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="账号">
          <a-input
            v-model:value="searchParams.userAccount"
            placeholder="输入账号"
            allowClear
            @change="doSearch"
          >
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>
        <a-form-item label="用户名">
          <a-input
            v-model:value="searchParams.username"
            placeholder="输入用户名"
            allowClear
            @change="doSearch"
          >
            <template #prefix><UserOutlined /></template>
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
          <h2>用户列表</h2>
          <span>共 {{ total }} 位用户</span>
        </div>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'userAvatar'">
            <a-avatar :src="record.userAvatar" :size="42">
              <UserOutlined />
            </a-avatar>
          </template>
          <template v-else-if="column.dataIndex === 'userRole'">
            <a-tag v-if="record.userRole === 'admin'" class="role-tag admin-role">管理员</a-tag>
            <a-tag v-else class="role-tag user-role">普通用户</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            <span class="create-time">{{ record.createTime }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button danger class="delete-button" @click="doDelete(record.id)">
              <DeleteOutlined />
              删除
            </a-button>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { deleteUser, listUserVoByPage } from '@/api/userController.ts'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { DeleteOutlined, SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { MANAGE_PAGE_SIZE } from '@/constant/app'

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    align: 'center',
  },
  {
    title: '账号',
    dataIndex: 'userAccount',
    align: 'center',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    align: 'center',
  },
  {
    title: '头像',
    dataIndex: 'userAvatar',
    align: 'center',
  },
  {
    title: '简介',
    dataIndex: 'userProfile',
    align: 'center',
  },
  {
    title: '用户角色',
    dataIndex: 'userRole',
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    align: 'center',
  },
]

const dataList = ref<API.UserVO[]>([])
const total = ref<number>(0)
const loading = ref(false)

// 搜索条件
const searchParams = reactive<API.UserQueryRequest>({
  pageNum: 1,
  pageSize: MANAGE_PAGE_SIZE,
})

// 分页参数（字段与 a-table 保持一致：current / pageSize）
const pagination = computed(() => {
  return {
    current: searchParams.pageNum ?? 1,
    pageSize: searchParams.pageSize ?? MANAGE_PAGE_SIZE,
    total: total.value,
    showSizeChanger: true,
    showTotal: (value: number) => `共 ${value} 条`,
  }
})
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

// 删除数据
const doDelete = async (id: string) => {
  if (!id) {
    return
  }
  const res = await deleteUser({ id })
  if (res.data.code === 0) {
    message.success('删除成功').then(() => {})
    await fetchData()
  } else {
    message.error('删除失败').then(() => {})
  }
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listUserVoByPage({
      ...searchParams,
    })
    if (res.data.data) {
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
.user-manage-page {
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
}

.table-panel :deep(.ant-table) {
  color: #52627a;
  font-size: 13px;
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

.table-panel :deep(.ant-table-tbody > tr > td:first-child) {
  color: #94a3b8;
  font-size: 12px;
}

.table-panel :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fbff !important;
}

.table-panel :deep(.ant-pagination) {
  padding: 8px 12px 0;
}

.role-tag {
  min-width: 64px;
  margin: 0;
  padding: 3px 8px;
  font-weight: 600;
  text-align: center;
  border: 0;
  border-radius: 6px;
}

.admin-role {
  color: #16856b;
  background: #e8faf4;
}

.user-role {
  color: #1677ff;
  background: #eaf3ff;
}

.create-time {
  color: #71829a;
}

.delete-button {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: #e85d75;
  font-size: 12px;
  border-color: #ffd8df;
  border-radius: 7px;
  background: #fff7f8;
}

.delete-button:hover,
.delete-button:focus {
  color: #fff !important;
  border-color: #f0667c !important;
  background: #f0667c !important;
}

@media (max-width: 760px) {
  .user-manage-page {
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

  .search-form :deep(.ant-input-affix-wrapper) {
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
