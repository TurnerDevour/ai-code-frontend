<template>
  <a-layout-header class="header" :class="{ 'is-narrow': narrowScreen }">
    <div class="header-row">
      <!-- 左侧：Logo和标题 -->
      <div class="header-left-col">
        <router-link class="header-left-link" to="/">
          <div class="header-left">
            <img class="logo" src="@/assets/logo.png" alt="Logo" />
            <h1 class="site-title"><span>AI应用生成平台</span></h1>
          </div>
        </router-link>
      </div>
      <!-- 中间：导航菜单 -->
      <div class="header-nav-col">
        <a-menu
          class="header-navigation"
          v-model:selectedKeys="current"
          mode="horizontal"
          :items="items"
          @click="handleMenuClick"
        />
      </div>
      <!-- 右侧：用户操作区域 -->
      <div class="header-user-col">
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
      </div>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import {
  UserOutlined,
  HomeOutlined,
  UserAddOutlined,
  AppstoreOutlined,
  CommentOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'
import { ACCESS } from '@/constant/access.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { useMessage } from '@/composables/useMessage'
import { userLogout } from '@/api/userController.ts'

const router = useRouter()
const loginUserStore = useLoginUserStore()
const { success, fail } = useMessage()

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
  AppstoreOutlined,
  CommentOutlined,
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
    success('退出登录成功')
    await router.push('/user/login')
  } else {
    fail('退出登录失败', res.data)
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

// 窄屏（平板 / 手机）下头部改为两行：菜单独占一行，用户区另起一行。
// 否则 logo + 菜单 + 用户信息挤在一行里，会把头部撑得比视口更宽
const narrowScreen = ref(false)
const syncNarrowScreen = () => {
  narrowScreen.value = window.innerWidth <= 900
}
onMounted(() => {
  syncNarrowScreen()
  window.addEventListener('resize', syncNarrowScreen)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', syncNarrowScreen)
})
</script>

<style scoped>
.header {
  flex: 0 0 auto;
  background: #fff;
  padding: 0 24px;
}

/* 头部骨架：左侧固定、菜单居中、右侧用户区，均不允许把头部撑出视口 */
.header-row {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

.header-left-col {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.header-nav-col {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;

  /* min-width: 0 让中间列可以被压缩，而不是被菜单的固有宽度顶宽 */
  min-width: 0;
}

.header-user-col {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
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
  min-width: 0;
  margin: 0 auto;
  padding: 0;
  justify-content: center;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item),
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-submenu) {
  display: inline-flex;
  top: 0;
  align-items: center;
  height: 64px;
  margin: 0 4px;
  padding: 0 14px;
  color: #61738d;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  background: transparent !important;
  border-radius: 0;
  transition: color 0.22s ease;
}

/* 选中态用底部渐变细线表示：不再用整块蓝色底，避免只有一项时格外突兀 */
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item)::after,
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-submenu)::after {
  position: absolute;
  right: 10px;
  bottom: 12px;
  left: 10px;
  border-bottom: 0 !important;
  border-radius: 999px;
  opacity: 0;
  transform: scaleX(0.4);
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
  content: '';
}

.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item:hover)::after,
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-submenu:hover)::after,
.header-navigation :deep(.ant-menu-horizontal > .ant-menu-item-selected)::after {
  height: 2px;
  background: linear-gradient(90deg, #1677ff, #6d5dfc);
  opacity: 1;
  transform: scaleX(1);
}

.header-navigation :deep(.ant-menu-item:hover),
.header-navigation :deep(.ant-menu-submenu:hover) {
  color: #1677ff !important;
}

.header-navigation :deep(.ant-menu-item-selected) {
  color: #1677ff !important;
  font-weight: 600;
  background: transparent !important;
}

.header-navigation :deep(.ant-menu-item .anticon) {
  margin-right: 6px;
  font-size: 15px;
}

/* —— 窄屏（<=900px，由 is-narrow 控制）—— */
.header.is-narrow {
  height: auto;
  line-height: normal;
  padding: 8px 16px 0;
}

.header.is-narrow .header-row {
  flex-wrap: wrap;
  row-gap: 2px;
}

.header.is-narrow .header-nav-col {
  /* block 而不是 flex：作为 flex 项时中间列会按菜单的固有宽度撑开，
     菜单随之被顶到视口左侧 */
  display: block;
  order: 3;
  flex: 1 1 100%;

  /* 菜单自己会做「多出的项收进省略号」的处理，这里不要再加一层横向滚动 */
  overflow: hidden;
}

.header.is-narrow .header-user-col {
  margin-left: auto;
}

/* 窄屏菜单：占满整行，放不下的项由 antd 收进末尾的省略号菜单 */
.header.is-narrow .header-navigation {
  width: 100%;
  height: 50px;
  line-height: 50px;
}

.header.is-narrow .header-navigation :deep(.ant-menu-overflow) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  justify-content: flex-start;
  border: 0;
  box-shadow: none;
}

.header.is-narrow .header-navigation :deep(.ant-menu-horizontal > .ant-menu-item) {
  flex: 0 0 auto;
  height: 50px;
  padding: 0 12px;
}

/* 窄屏选中态：下划线贴着菜单底部 */
.header.is-narrow .header-navigation :deep(.ant-menu-horizontal > .ant-menu-item)::after {
  bottom: 4px;
}

@media (max-width: 480px) {
  .header {
    padding: 0 12px;
  }

  .header.is-narrow {
    padding: 8px 12px 0;
  }

  .site-title {
    padding: 6px 9px;
    font-size: 14px;
  }

  .logo {
    width: 38px;
    height: 38px;
  }
}
</style>
