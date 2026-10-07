<template>
  <AuthShell
    hero-title="让每个创意，快速成为应用"
    hero-subtitle="使用 AI 驱动的零代码能力，将想法高效落地。"
    card-eyebrow="WELCOME BACK"
    card-title="欢迎登录"
    card-subtitle="登录后继续构建你的精彩应用"
  >
    <a-form :model="formState" name="basic" autocomplete="on" @finish="handleSubmit">
      <a-form-item
        name="userAccount"
        :rules="[
          { required: true, message: '请输入账号' },
          { min: 4, message: '账号不能小于 4 位' },
          { max: 20, message: '账号不能大于 20 位' },
        ]"
      >
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号">
          <template #prefix>
            <UserOutlined />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码不能小于 6 位' },
          { max: 20, message: '密码不能大于 20 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码">
          <template #prefix>
            <LockOutlined />
          </template>
        </a-input-password>
      </a-form-item>
      <div class="tips">
        <span>还没有账号？</span>
        <RouterLink to="/user/register">立即注册</RouterLink>
      </div>
      <a-form-item class="submit-item">
        <a-button type="primary" html-type="submit" class="auth-submit-button">
          登录并开始创作
          <ArrowRightOutlined />
        </a-button>
      </a-form-item>
    </a-form>
  </AuthShell>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRightOutlined, LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import AuthShell from '@/components/AuthShell.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useMessage } from '@/composables/useMessage'
import { userLogin } from '@/api/userController'

const router = useRouter()
const loginUserStore = useLoginUserStore()
const { success, fail } = useMessage()

const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values: API.UserLoginRequest) => {
  const res = await userLogin(values)
  // 登录成功，把登录态保存到全局状态中
  if (res.data.code === 0 && res.data.data) {
    await loginUserStore.fetchLoginUser()
    await router.push({
      path: '/',
      replace: true,
    })
    success('登录成功')
  } else {
    fail('登录失败', res.data)
  }
}
</script>
