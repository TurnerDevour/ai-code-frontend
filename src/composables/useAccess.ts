/**
 * 登录态与资源归属判定的组合式函数。
 *
 * 背景：同一套权限判断散落在多个页面里，写法还各不相同：
 *   - 对话页用 app.userId 判定归属，列表页用 app.user?.id；
 *   - 列表页在 id 缺失时「不拦截」，对话页与编辑页则要求双方 id 都存在；
 *   - 管理员判定 `userRole === ACCESS.ADMIN` 在头尾、编辑页、列表页各写了一遍。
 * 这里把判定收口，同时保留两种语义（严格 / 宽松），避免改变各页面既有行为。
 */
import { computed } from 'vue'
import { ACCESS } from '@/constant/access'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

export const useAccess = () => {
  const loginUserStore = useLoginUserStore()

  /** 当前登录用户 id */
  const loginUserId = computed(() => loginUserStore.loginUser.id)

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!loginUserId.value)

  /** 当前登录用户是否为管理员 */
  const isAdmin = computed(() => loginUserStore.loginUser.userRole === ACCESS.ADMIN)

  /**
   * 取出应用的创建者 id
   * <p>
   * 列表接口把创建者放在 `app.user.id`，详情接口直接给 `app.userId`，两种都要认。
   */
  const getOwnerId = (app?: API.AppVO | null) => app?.userId ?? app?.user?.id

  /**
   * 严格归属判定：双方 id 都拿到且相等才算本人
   * <p>
   * 用于对话页、编辑页这类「判不出来就不能操作」的场景。
   */
  const isOwner = (app?: API.AppVO | null) => {
    const ownerId = getOwnerId(app)
    if (!loginUserId.value || !ownerId) {
      return false
    }
    return String(ownerId) === String(loginUserId.value)
  }

  /**
   * 宽松归属判定：任一侧 id 缺失时不拦截
   * <p>
   * 用于首页列表卡片这类「宁可放行、进去后由后端校验」的场景：
   * 后端未返回 user 时不会让卡片永久处于禁用态。
   */
  const canViewChat = (app?: API.AppVO | null) => {
    const ownerId = getOwnerId(app)
    if (!loginUserId.value || !ownerId) {
      return true
    }
    return String(ownerId) === String(loginUserId.value)
  }

  /** 是否可管理该应用：管理员或本人 */
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
