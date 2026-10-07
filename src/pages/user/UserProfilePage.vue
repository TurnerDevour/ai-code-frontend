<template>
  <div class="user-profile-page">
    <h2>个人中心</h2>
    <FormPanel :panel="false">
      <a-form
        :model="formState"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 16 }"
        @finish="handleSubmit"
      >
        <a-form-item
          label="昵称"
          name="username"
          :rules="[
            { required: true, message: '请输入昵称' },
            { max: 20, message: '昵称不能大于 20 位' },
          ]"
        >
          <a-input v-model:value="formState.username" />
        </a-form-item>
        <a-form-item label="头像链接" name="userAvatar">
          <a-input v-model:value="formState.userAvatar" placeholder="请输入头像图片链接" />
        </a-form-item>
        <a-form-item label="个人简介" name="userProfile">
          <a-textarea v-model:value="formState.userProfile" :rows="4" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 4, span: 16 }">
          <a-button type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>
    </FormPanel>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormPanel from '@/components/FormPanel.vue'
import { useAccess } from '@/composables/useAccess'
import { useMessage } from '@/composables/useMessage'
import { updateUser } from '@/api/userController.ts'

const router = useRouter()
const route = useRoute()
const { loginUserStore } = useAccess()
const { success, error, handle } = useMessage()

const formState = reactive<API.UserUpdateRequest>({
  id: '',
  userRole: '',
  username: '',
  userAvatar: '',
  userProfile: '',
})

onMounted(async () => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser.id) {
    error('请先登录')
    await router.replace('/user/login')
    return
  }

  formState.id = loginUser.id
  formState.username = loginUser.username ?? ''
  formState.userAvatar = loginUser.userAvatar ?? ''
  formState.userProfile = loginUser.userProfile ?? ''
})

const handleSubmit = async () => {
  if (!formState.id) {
    error('用户信息未加载完成')
    return
  }

  const res = await updateUser({ ...formState })
  if (!handle(res, { fail: '保存失败' })) {
    return
  }
  await loginUserStore.fetchLoginUser()
  success('保存成功')
  const redirect = route.query.redirect
  if (
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    redirect !== '/user/profile'
  ) {
    await router.replace(redirect)
  } else {
    await router.replace('/')
  }
}
</script>

<style scoped>
.user-profile-page {
  max-width: 720px;
  margin: 0 auto;
}
</style>
