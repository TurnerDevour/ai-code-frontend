<template>
  <div class="user-manage-panel">
    <AdminSearchPanel label="筛选用户">
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
    </AdminSearchPanel>

    <AdminTablePanel title="用户列表" :total="total" unit="位用户">
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
    </AdminTablePanel>
  </div>
</template>

<script setup lang="ts">
/**
 * 运营管理 - 用户管理页签的内容：筛选面板 + 用户列表表格。
 * 页头由 OperationManagePage 统一提供，这里只负责该页签的数据与交互。
 */
import { DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons-vue'
import { deleteUser, listUserVoByPage } from '@/api/userController.ts'
import AdminSearchPanel from '@/components/AdminSearchPanel.vue'
import AdminTablePanel from '@/components/AdminTablePanel.vue'
import { useMessage } from '@/composables/useMessage'
import { usePagedQuery } from '@/composables/usePagedQuery'
import { MANAGE_PAGE_SIZE } from '@/constant/app'

const { handle: handleResponse } = useMessage()

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

const {
  dataList,
  total,
  loading,
  query: searchParams,
  pagination,
  load: fetchData,
  search: doSearch,
  changePage: doTableChange,
} = usePagedQuery<API.UserVO, API.UserQueryRequest>({
  initialQuery: { pageNum: 1, pageSize: MANAGE_PAGE_SIZE },
  pageSize: MANAGE_PAGE_SIZE,
  fetchPage: (query) => listUserVoByPage({ ...query }),
})

// 删除数据
const doDelete = async (id: string) => {
  if (!id) {
    return
  }
  const res = await deleteUser({ id })
  if (handleResponse(res, { success: '删除成功', fail: '删除失败' })) {
    await fetchData()
  }
}
</script>

<style scoped>
.user-manage-panel {
  position: relative;
  display: flex;
  flex-direction: column;

  /* 高度由运营管理页逐层约束后透下来：高度占满标签页，剩余空间全部给列表区域 */
  height: 100%;
  min-height: 0;
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
  .user-manage-panel {
    height: auto;
  }
}
</style>
