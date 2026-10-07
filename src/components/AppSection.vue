<template>
  <section class="app-section">
    <header class="section-header">
      <div class="section-title">
        <h2>{{ title }}</h2>
        <span class="section-tip">{{ tip }}</span>
      </div>
      <div class="section-actions">
        <a-input
          :value="keyword"
          class="section-search"
          :placeholder="searchPlaceholder"
          allow-clear
          @update:value="emit('update:keyword', $event)"
          @press-enter="emit('search')"
          @change="emit('clear', $event)"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <slot name="actions" />
      </div>
    </header>
    <a-spin :spinning="loading">
      <div v-if="apps.length" class="app-grid">
        <AppCard
          v-for="app in apps"
          :key="app.id"
          :app="app"
          :can-view-chat="canViewChat(app)"
          @view-chat="emit('view-chat', $event)"
        />
      </div>
      <a-empty v-else class="app-empty" :description="emptyText" />
    </a-spin>
    <div v-if="total > pageSize" class="pagination-wrapper">
      <a-pagination
        :current="pageNum"
        :page-size="pageSize"
        :total="total"
        :show-size-changer="false"
        hide-on-single-page
        @change="emit('change-page', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 首页的应用列表区块（「我的应用」与「精选案例」）。
 *
 * 首页此前把同一段结构写了两遍：区块标题 + 搜索框 + 可选的操作按钮 +
 * 卡片网格 + 空态 + 分页，连同下面的样式一共重复了近百行。
 * 两处真正不同的只有标题文案、数据来源和「我的应用」多一个创建按钮，因此收成一个区块组件。
 */
import { SearchOutlined } from '@ant-design/icons-vue'
import AppCard from '@/components/AppCard.vue'

withDefaults(
  defineProps<{
    /** 区块标题 */
    title: string
    /** 标题右侧的说明文字 */
    tip: string
    /** 搜索框占位文案 */
    searchPlaceholder: string
    /** 空态文案 */
    emptyText: string
    /** 搜索关键字（配合 v-model:keyword 使用） */
    keyword?: string
    /** 当前页应用列表 */
    apps: API.AppVO[]
    /** 应用总数 */
    total: number
    /** 当前页码 */
    pageNum: number
    /** 每页数量 */
    pageSize: number
    /** 列表加载中 */
    loading?: boolean
    /** 单张卡片是否可进入对话（由页面按登录态判定） */
    canViewChat: (app: API.AppVO) => boolean
  }>(),
  {
    keyword: '',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:keyword', value: string): void
  /** 回车搜索 / 点搜索按钮 */
  (e: 'search'): void
  /** 搜索框内容变化（清空时页面可立即刷新） */
  (e: 'clear', event: Event): void
  (e: 'change-page', page: number): void
  (e: 'view-chat', app: API.AppVO): void
}>()
</script>

<style scoped>
.app-section {
  margin-bottom: 54px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 22px;
}

.section-title h2 {
  margin: 0 0 6px;
  color: #172b4d;
  font-weight: 800;
  font-size: 30px;
  letter-spacing: -0.8px;
}

.section-tip {
  color: #8190a5;
  font-size: 13px;
}

.section-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.section-search {
  width: 240px;
  height: 38px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
}

.section-search :deep(.ant-input) {
  background: transparent;
}

.section-search :deep(.ant-input-prefix) {
  margin-right: 8px;
  color: #8da0ba;
}

.app-grid {
  display: grid;

  /* 单列宽度上限 440px：应用只有 1~2 个时，卡片不会被拉伸成细长条。
     列数与列宽由下面的媒体查询接管，容器内没有余量，左边缘始终与标题对齐 */
  grid-template-columns: repeat(2, minmax(0, 440px));
  gap: 24px;
}

.app-empty {
  padding: 36px 0;
  background: rgb(255 255 255 / 70%);
  border: 1px dashed #e2ecf9;
  border-radius: 18px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

/* 宽屏：每行 3 列（与设计稿一致），单列最多 440px */
@media (min-width: 1200px) {
  .app-grid {
    grid-template-columns: repeat(3, minmax(0, 440px));
  }
}

/* 手机：单列 */
@media (max-width: 760px) {
  .app-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .section-actions {
    flex-wrap: wrap;
  }

  .section-search {
    flex: 1;
    width: auto;
  }

  .section-title h2 {
    font-size: 24px;
  }
}
</style>
