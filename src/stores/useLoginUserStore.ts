import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentUser } from '@/api/userController'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({})

  // 获取登录用户信息
  const fetchLoginUser = async () => {
    const res = await getCurrentUser()
    if (res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data
    }
  }

  // 设置登录用户信息
  const setLoginUser = (user: API.LoginUserVO) => {
    loginUser.value = user
  }

  return {
    loginUser,
    fetchLoginUser,
    setLoginUser,
  }
})
