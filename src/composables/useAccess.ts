/**
 * 登录态与资源归属判定的组合式函数。
 *
 * 各页面原有两种写法（对话页看 `app.userId`、列表页看 `app.user?.id`）和两种语义
 * （严格：双方 id 都存在且相等；宽松：id 缺失时不拦截），这里都保留，避免改变既有行为。
 */
import { computed } from 'vue'
import { ACCESS } from '@/constant/access'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

export const useAccess = () => {
  const loginUserStore = useLoginUserStore()

  /** 当前登录用户 id */
  const loginUserId = computed(() => loginUserStore.loginUser.id)

  const isLoggedIn = computed(() => !!loginUserId.value)

  /** 管理员判定：`userRole === ACCESS.ADMIN` */
  const isAdmin = computed(() => loginUserStore.loginUser.userRole === ACCESS.ADMIN)

  /** 取应用创建者 id：列表接口给 `app.user.id`，详情接口给 `app.userId`，两种都认 */
  const getOwnerId = (app?: API.AppVO | null) => app?.userId ?? app?.user?.id

  /** 严格归属判定：双方 id 都存在且相等才算本人（对话页、编辑页这类判不出来就不能操作） */
  const isOwner = (app?: API.AppVO | null) => {
    const ownerId = getOwnerId(app)
    if (!loginUserId.value || !ownerId) {
      return false
    }
    return String(ownerId) === String(loginUserId.value)
  }

  /** 宽松归属判定：任一侧 id 缺失时不拦截（首页卡片宁可放行，后端未返回 user 也不会永久禁用） */
  const canViewChat = (app?: API.AppVO | null) => {
    const ownerId = getOwnerId(app)
    if (!loginUserId.value || !ownerId) {
      return true
    }
    return String(ownerId) === String(loginUserId.value)
  }

  /** 可管理该应用：管理员或本人 */
  const canManage = (app?: API.AppVO | null) => isAdmin.value || isOwner(app)

  return {
    loginUserStore,
    loginUserId,
    isLoggedIn,
    isAdmin,
    isOwner,
    canViewChat,
    canManage,
  }
}
