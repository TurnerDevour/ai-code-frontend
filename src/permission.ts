import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { message } from 'ant-design-vue'
import { ACCESS } from '@/constant/access'
import router from '@/router'

// 只在首次路由跳转时拉取登录用户，避免每次跳转都请求
let firstFetchLoginUser = true

// 全局权限校验：无权限与未登录分别重定向并带上 redirect 回跳地址
router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  let loginUser = loginUserStore.loginUser
  if (firstFetchLoginUser) {
    await loginUserStore.fetchLoginUser()
    loginUser = loginUserStore.loginUser
    firstFetchLoginUser = false
  }
  if (to.meta.role === ACCESS.ADMIN && loginUser.userRole !== ACCESS.ADMIN) {
    message.error('没有权限').then(() => {})
    next(`/?redirect=${to.fullPath}`)
    return
  }
  if (to.meta.requiresAuth && !loginUser.id) {
    message.error('请先登录').then(() => {})
    next(`/user/login?redirect=${to.fullPath}`)
    return
  }
  next()
})
