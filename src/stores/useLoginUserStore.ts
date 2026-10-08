import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentUser } from '@/api/userController'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({})

  // 拉取当前登录用户（未登录时后端返回空数据，保持 loginUser 为空对象）
  const fetchLoginUser = async () => {
    const res = await getCurrentUser()
    if (res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data
    }
  }

  // 写入登录用户信息
  const setLoginUser = (user: API.LoginUserVO) => {
    loginUser.value = user
  }

  return {
    loginUser,
    fetchLoginUser,
    setLoginUser,
  }
})
