<template>
  <a-layout-header class="header">
    <a-row :wrap="false">
      <!-- 左侧：Logo和标题 -->
      <a-col flex="200px">
        <RouterLink to="/">
          <div class="header-left">
            <img class="logo" src="@/assets/logo.svg" alt="Logo" />
            <h1 class="site-title">AI应用生成</h1>
          </div>
        </RouterLink>
      </a-col>
      <!-- 中间：导航菜单 -->
      <a-col flex="auto">
        <a-menu
          v-model:selectedKeys="current"
          mode="horizontal"
          :items="items"
          @click="handleMenuClick"
        />
      </a-col>
      <!-- 右侧：用户操作区域 -->
      <a-col>
        <div class="user-login-status">
          <a-button type="primary">登录</a-button>
        </div>
      </a-col>
    </a-row>
  </a-layout-header>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { HomeOutlined } from '@ant-design/icons-vue'

const router = useRouter()

const handleMenuClick: MenuProps['onClick'] = (info) => {
  const key = String(info.key)
  if (key.startsWith('/')) {
    router.push({
      path: key,
    })
  }
}

const iconMap = {
  HomeOutlined,
} as const
type IconName = keyof typeof iconMap
const isIconName = (value: unknown): value is IconName => {
  return typeof value === 'string' && value in iconMap
}

const current = ref<string[]>([])
const items = computed<NonNullable<MenuProps['items']>>(() =>
  router
    .getRoutes()
    .filter((route) => route.meta?.showNav && route.path && !route.path.includes('/:'))
    .map((route) => {
      const menuText = String(route.meta?.title)
      const menuIcon = route.meta?.icon
      return {
        key: route.path,
        label: menuText,
        title: menuText,
        icon: isIconName(menuIcon) ? h(iconMap[menuIcon]) : undefined,
      }
    }),
)

const updateCurrentMenu = (path: string) => {
  const matchedItem = items.value.find((item) => item?.key === path)
  if (matchedItem?.key) {
    current.value = [String(matchedItem.key)]
  } else {
    current.value = []
  }
}

// 高亮当前菜单项
router.afterEach((to) => {
  updateCurrentMenu(to.path)
})

updateCurrentMenu(router.currentRoute.value.path)
</script>

<style scoped>
.header {
  background: #fff;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  height: 48px;
  width: 48px;
}

.site-title {
  margin: 0;
  font-size: 18px;
  color: #1296db;
}

.ant-menu-horizontal {
  border-bottom: none !important;
}
</style>
