<template>
  <AuthShell
    hero-subtitle="只需几步，创建账号并开始构建属于你的智能应用。"
    card-eyebrow="CREATE ACCOUNT"
    card-title="创建账号"
    card-subtitle="加入 AICoding，立即开始你的创作之旅"
  >
    <template #hero-title>从一个想法，<br />开启无限可能</template>

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
      <a-form-item
        name="checkPassword"
        :rules="[
          { required: true, message: '请输入确认密码' },
          { min: 6, message: '确认密码不能小于 6 位' },
          { max: 20, message: '确认密码不能大于 20 位' },
        ]"
      >
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码">
          <template #prefix>
            <LockOutlined />
          </template>
        </a-input-password>
      </a-form-item>
      <div class="tips">
        <span>已有账号？</span>
        <RouterLink to="/user/login">立即登录</RouterLink>
      </div>
      <a-form-item class="submit-item">
        <a-button type="primary" html-type="submit" class="auth-submit-button">
          创建账号并开始创作
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
import { useMessage } from '@/composables/useMessage'
import { userRegister } from '@/api/userController'

const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const router = useRouter()
const { success, error, fail } = useMessage()

const handleSubmit = async (values: API.UserRegisterRequest) => {
  if (formState.userPassword !== formState.checkPassword) {
    error('二次输入的密码不一致')
    return
  }
  const res = await userRegister(values)
  if (res.data.code === 0 && res.data.data) {
    await router.push({
      path: '/user/login',
      replace: true,
    })
    success('注册成功')
  } else {
    fail('注册失败', res.data)
  }
}
</script>
