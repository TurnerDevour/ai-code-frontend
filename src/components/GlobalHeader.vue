<template>
  <a-layout-header class="header">
    <a-row :wrap="false">
      <!-- 左侧：Logo和标题 -->
      <a-col flex="230px">
        <router-link class="header-left-link" to="/">
          <div class="header-left">
            <img class="logo" src="@/assets/logo.png" alt="Logo" />
            <h1 class="site-title"><span>AI应用生成平台</span></h1>
          </div>
        </router-link>
      </a-col>
      <!-- 中间：导航菜单 -->
      <a-col flex="auto">
        <a-menu
          class="header-navigation"
          v-model:selectedKeys="current"
          mode="horizontal"
          :items="items"
          @click="handleMenuClick"
        />
      </a-col>
      <!-- 右侧：用户操作区域 -->
      <a-col>
        <div class="user-login-status">
          <template v-if="loginUserStore.loginUser.id">
            <a-dropdown>
              <ASpace>
                <a-avatar :src="loginUserStore.loginUser.userAvatar" />
                {{ loginUserStore.loginUser.username ?? '云图库用户' }}
              </ASpace>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="goToUserProfile">
                    <UserOutlined />
                    个人中心
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-divider />
                  <a-menu-item @click="doLogout">
                    <LogoutOutlined />
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
          <template v-else>
            <a-button type="primary" href="/user/login" class="header-login-button">登录</a-button>
          </template>
        </div>
      </a-col>
    </a-row>
  </a-layout-header>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { UserOutlined, HomeOutlined, UserAddOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { ACCESS } from '@/constant/access.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { userLogout } from '@/api/userController.ts'

const router = useRouter()
const loginUserStore = useLoginUserStore()

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
  UserAddOutlined,
} as const
type IconName = keyof typeof iconMap
const isIconName = (value: unknown): value is IconName => {
  return typeof value === 'string' && value in iconMap
}

const current = ref<string[]>([])
const items = computed<NonNullable<MenuProps['items']>>(() =>
  router
    .getRoutes()
    .filter(
      (route) =>
        route.meta?.showNav &&
        route.path &&
        !route.path.includes('/:') &&
        (route.meta?.role !== ACCESS.ADMIN || loginUserStore.loginUser.userRole === ACCESS.ADMIN),
    )
    .sort((firstRoute, secondRoute) => {
      if (firstRoute.path === '/') {
        return -1
      }
      if (secondRoute.path === '/') {
        return 1
      }
      return 0
    })
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

const goToUserProfile = () => {
  router.push({
    path: '/user/profile',
    query: {
      redirect: router.currentRoute.value.fullPath,
    },
  })
}

// 用户注销
const doLogout = async () => {
  const res = await userLogout()
  if (res.data.code === 0) {
    loginUserStore.setLoginUser({
      username: '未登录',
    })
    message.success('退出登录成功').then(() => {})
    await router.push('/user/login')
  } else {
    message.error('退出登录失败，' + res.data.message).then(() => {})
  }
}

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

.header-left-link {
  display: flex;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 44px;
  height: 44px;
}

.site-title {
  margin: 0;
  padding: 6px 11px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.3px;
  border: 1px solid #dbeafe;
  border-radius: 9px;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
  box-shadow: 0 4px 12px rgb(22 119 255 / 8%);
}

.site-title span {
  display: block;
  color: #1677ff;
  background: linear-gradient(105deg, #1677ff, #6d5dfc);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-left:hover .site-title {
  border-color: #bfdbfe;
  background: linear-gradient(135deg, #e8f2ff, #ede9fe);
}

.header-login-button {
  min-width: 72px;
  height: 34px;
  line-height: 25px;
  font-weight: 600;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(105deg, #1677ff, #6d5dfc);
  box-shadow: 0 7px 15px rgb(50 91 212 / 22%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.header-login-button:hover,
.header-login-button:focus {
  background: linear-gradient(105deg, #3b8cff, #8173ff) !important;
  box-shadow: 0 9px 19px rgb(50 91 212 / 30%);
  transform: translateY(-1px);
}

.header-navigation {
  height: 64px;
  line-height: 64px;
  background: transparent;
  border-bottom: 0 !important;
}

.header-navigation :deep(.ant-menu-overflow) {
  width: fit-content;
  min-width: 230px;
  height: 50px;
  margin: 7px auto;
  padding: 6px;
  justify-content: center;
  background: #f7f9fc;
  border: 1px solid #edf2fa;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgb(31 73 125 / 5%);
}

.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item),
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-submenu) {
  top: 0;
  height: 38px;
  margin: 0 2px;
  padding: 0 15px;
  color: #61738d;
  font-size: 14px;
  font-weight: 500;
  line-height: 38px;
  border-radius: 9px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item::after),
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-submenu::after) {
  border-bottom: 0 !important;
}

.header-navigation :deep(.ant-menu-item:hover),
.header-navigation :deep(.ant-menu-submenu:hover) {
  color: #1677ff !important;
  background: #f1f6ff;
}

.header-navigation :deep(.ant-menu-item-selected) {
  color: #fff !important;
  font-weight: 600;
  background: linear-gradient(105deg, #1677ff, #6d5dfc) !important;
  box-shadow: 0 5px 12px rgb(59 95 219 / 25%);
}

.header-navigation :deep(.ant-menu-item .anticon) {
  margin-right: 6px;
  font-size: 15px;
}

@media (max-width: 760px) {
  .header-navigation :deep(.ant-menu-overflow) {
    width: auto;
    min-width: 0;
    margin-right: 0;
    margin-left: 0;
    justify-content: flex-start;
  }

  .header-navigation :deep(.ant-menu-horizontal > .ant-menu-item) {
    margin-right: 2px;
    margin-left: 2px;
    padding: 0 10px;
  }
}
</style>
