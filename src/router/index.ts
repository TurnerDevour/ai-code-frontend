import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ACCESS } from '@/constant/access.ts'

const menuItems: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: '首页',
      icon: 'HomeOutlined',
      showNav: true,
      role: ACCESS.USER,
    },
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/app/chat/:id',
    name: 'appChat',
    meta: {
      title: '应用生成',
      showNav: false,
      hideHeader: true,
      hideFooter: true,
      requiresAuth: true,
      role: ACCESS.USER,
    },
    component: () => import('@/pages/app/AppChatPage.vue'),
  },
  {
    path: '/app/edit/:id',
    name: 'appEdit',
    meta: {
      title: '应用信息修改',
      showNav: false,
      requiresAuth: true,
      role: ACCESS.USER,
    },
    component: () => import('@/pages/app/AppEditPage.vue'),
  },
  {
    path: '/user/login',
    name: 'login',
    meta: {
      title: '登录',
      showNav: false,
      role: ACCESS.USER,
    },
    component: () => import('@/pages/user/UserLoginPage.vue'),
  },
  {
    path: '/user/register',
    name: 'register',
    meta: {
      title: '注册',
      showNav: false,
      role: ACCESS.USER,
    },
    component: () => import('@/pages/user/UserRegisterPage.vue'),
  },
  {
    path: '/user/profile',
    name: 'userProfile',
    meta: {
      title: '个人中心',
      role: ACCESS.USER,
      showNav: false,
      requiresAuth: true,
    },
    component: () => import('@/pages/user/UserProfilePage.vue'),
  },
  {
    path: '/admin/userManage',
    name: 'userManage',
    meta: {
      title: '用户管理',
      icon: 'UserAddOutlined',
      showNav: true,
      role: ACCESS.ADMIN,
    },
    component: () => import('@/pages/admin/UserManagePage.vue'),
  },
  {
    path: '/admin/appManage',
    name: 'appManage',
    meta: {
      title: '应用管理',
      icon: 'AppstoreOutlined',
      showNav: true,
      role: ACCESS.ADMIN,
    },
    component: () => import('@/pages/admin/AppManagePage.vue'),
  },
  {
    path: '/admin/chatManage',
    name: 'chatManage',
    meta: {
      title: '对话管理',
      icon: 'CommentOutlined',
      showNav: true,
      role: ACCESS.ADMIN,
    },
    component: () => import('@/pages/admin/ChatManagePage.vue'),
  },
  {
    path: '/admin/appEdit/:id',
    name: 'appEditByAdmin',
    meta: {
      title: '应用信息修改',
      showNav: false,
      requiresAuth: true,
      role: ACCESS.ADMIN,
    },
    component: () => import('@/pages/app/AppEditPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: menuItems,
})

export default router
