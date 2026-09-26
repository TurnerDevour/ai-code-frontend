import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const menuItems: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: '首页',
      icon: 'HomeOutlined',
      showNav: true,
    },
    component: () => import('@/pages/HomePage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: menuItems,
})

export default router
