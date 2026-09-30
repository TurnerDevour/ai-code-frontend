<template>
  <div class="user-login-page">
    <div class="background-orb orb-left"></div>
    <div class="background-orb orb-right"></div>

    <section class="login-hero">
      <div class="brand-mark">
        <RocketOutlined />
      </div>
      <span class="eyebrow">AI CODING PLATFORM</span>
      <h1>让每个创意，快速成为应用</h1>
      <p>使用 AI 驱动的零代码能力，将想法高效落地。</p>
      <div class="feature-list">
        <span><SafetyCertificateOutlined /> 安全可靠</span>
        <span><ThunderboltOutlined /> 高效生成</span>
      </div>
    </section>

    <section class="login-card">
      <div class="card-heading">
        <span class="welcome">WELCOME BACK</span>
        <h2>欢迎登录</h2>
        <p>登录后继续构建你的精彩应用</p>
      </div>

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
          <a-button type="primary" html-type="submit" class="login-button">
            登录并开始创作
            <ArrowRightOutlined />
          </a-button>
        </a-form-item>
      </a-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { message } from 'ant-design-vue'
import {
  ArrowRightOutlined,
  LockOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { userLogin } from '@/api/userController'

const router = useRouter()
const loginUserStore = useLoginUserStore()

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
    await message.success('登录成功')
  } else {
    await message.error('登录失败，' + res.data.message)
  }
}
</script>

<style scoped>
.user-login-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  align-items: center;
  gap: clamp(40px, 8vw, 132px);
  min-height: calc(100vh - 152px);
  max-width: 1040px;
  margin: 0 auto;
  overflow: hidden;
}

.background-orb {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.7;
}

.orb-left {
  width: 300px;
  height: 300px;
  top: 2%;
  left: -170px;
  background: radial-gradient(circle, #d9e8ff 0%, rgb(217 232 255 / 0%) 70%);
}

.orb-right {
  width: 360px;
  height: 360px;
  right: -190px;
  bottom: -80px;
  background: radial-gradient(circle, #dff7f1 0%, rgb(223 247 241 / 0%) 70%);
}

.login-hero {
  max-width: 500px;
}

.brand-mark {
  display: grid;
  width: 52px;
  height: 52px;
  margin-bottom: 28px;
  color: #fff;
  font-size: 25px;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 12px 28px rgb(54 103 210 / 25%);
}

.eyebrow,
.welcome {
  display: block;
  color: #5375a4;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1.6px;
}

.login-hero h1 {
  max-width: 440px;
  margin: 16px 0;
  color: #172b4d;
  font-weight: 700;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.2;
  letter-spacing: -1.5px;
}

.login-hero > p {
  margin: 0;
  color: #6b7b93;
  font-size: 16px;
  line-height: 1.8;
}

.feature-list {
  display: flex;
  gap: 24px;
  margin-top: 30px;
  color: #48658b;
  font-size: 14px;
}

.feature-list span {
  display: inline-flex;
  gap: 7px;
  align-items: center;
}

.feature-list :deep(.anticon) {
  color: #1677ff;
}

.login-card {
  padding: 42px 38px 30px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(255 255 255 / 90%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgb(31 73 125 / 13%);
  backdrop-filter: blur(14px);
}

.card-heading {
  margin-bottom: 30px;
}

.card-heading h2 {
  margin: 9px 0 8px;
  color: #172b4d;
  font-size: 27px;
  line-height: 1.3;
}

.card-heading p {
  margin: 0;
  color: #8190a5;
  font-size: 14px;
}

.login-card :deep(.ant-form-item) {
  margin-bottom: 21px;
}

.login-card :deep(.ant-input-affix-wrapper) {
  height: 48px;
  padding: 0 14px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
  box-shadow: none;
}

.login-card :deep(.ant-input-affix-wrapper:hover),
.login-card :deep(.ant-input-affix-wrapper-focused) {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

.login-card :deep(.ant-input-prefix) {
  margin-right: 11px;
  color: #8da0ba;
  font-size: 16px;
}

.login-card :deep(.ant-input) {
  background: transparent;
  font-size: 14px;
}

.login-card :deep(.ant-input::placeholder) {
  color: #9eabc0;
}

.login-card :deep(.ant-form-item-explain-error) {
  padding-top: 4px;
  font-size: 12px;
}

.tips {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin: -3px 0 26px;
  color: #8290a4;
  font-size: 13px;
}

.tips a {
  color: #1677ff;
  font-weight: 600;
}

.submit-item {
  margin-bottom: 0 !important;
}

.login-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  font-weight: 600;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 10px 20px rgb(40 96 224 / 24%);
}

.login-button:hover,
.login-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
  transform: translateY(-1px);
}

@media (max-width: 760px) {
  .user-login-page {
    display: block;
    min-height: auto;
    max-width: 440px;
    padding: 28px 0 80px;
  }

  .login-hero {
    margin-bottom: 32px;
  }

  .brand-mark {
    width: 44px;
    height: 44px;
    margin-bottom: 18px;
    border-radius: 13px;
    font-size: 21px;
  }

  .login-hero h1 {
    max-width: none;
    margin: 10px 0;
    font-size: 32px;
  }

  .login-hero > p {
    font-size: 14px;
  }

  .feature-list {
    margin-top: 18px;
  }

  .login-card {
    padding: 32px 26px 26px;
  }
}

@media (max-width: 420px) {
  .feature-list {
    gap: 14px;
    font-size: 13px;
  }

  .login-card {
    padding: 28px 20px 22px;
    border-radius: 18px;
  }
}
</style>
