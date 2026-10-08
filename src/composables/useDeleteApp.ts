/**
 * 删除应用的组合式函数（首页「我的应用」卡片与应用详情弹窗共用）。
 *
 * 调普通用户接口（后端校验归属）-> 判断 code -> 提示 -> 收尾；调用方只提供「删完做什么」。
 */
import { ref } from 'vue'
import { deleteApp } from '@/api/appController'
import { useMessage } from './useMessage'

export interface UseDeleteAppOptions {
  /** 删除成功后的收尾（参数为被删除的应用 id） */
  onDeleted?: (appId: string) => void | Promise<void>
}

export const useDeleteApp = (options: UseDeleteAppOptions = {}) => {
  const { success, fail } = useMessage()

  /** 删除请求在途：按钮 loading 与防重复点击 */
  const deleting = ref(false)

  /** 删除应用；返回是否成功，调用方据此决定是否继续刷新 */
  const deleteAppById = async (appId?: string) => {
    if (!appId || deleting.value) {
      return false
    }
    deleting.value = true
    try {
      const res = await deleteApp({ id: appId })
      if (res.data.code !== 0) {
        fail('删除失败', res.data)
        return false
      }
      success('删除成功')
      await options.onDeleted?.(appId)
      return true
    } finally {
      deleting.value = false
    }
  }

  return {
    deleting,
    deleteAppById,
  }
}
