<template>
  <div class="user-profile-page">
    <h2>个人中心</h2>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { updateUser } from '@/api/userController.ts'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
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
    await message.error('请先登录')
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
    message.error('用户信息未加载完成').then(() => {})
    return
  }

  const res = await updateUser({ ...formState })
  if (res.data.code === 0) {
    await loginUserStore.fetchLoginUser()
    message.success('保存成功').then(() => {})
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
  } else {
    message.error('保存失败，' + res.data.message).then(() => {})
  }
}
</script>

<style scoped>
.user-profile-page {
  max-width: 720px;
  margin: 0 auto;
}

/* 手机宽度：标签改为每行独占，表单控件铺满整行。
   否则固定 4/16 的栅格会把输入框压到小于 antd 的固有最小宽度，
   内容被右侧裁掉（antd 的 .ant-col-* 优先级更高，需要 !important）。 */
@media (max-width: 640px) {
  .user-profile-page :deep(.ant-form-item-label),
  .user-profile-page :deep(.ant-form-item-control) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
  }

  .user-profile-page :deep(.ant-form-item-label) {
    padding-bottom: 4px;
    text-align: left;
  }

  .user-profile-page :deep(.ant-form-item-row) {
    flex-wrap: wrap;
  }
}
</style>
