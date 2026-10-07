<template>
  <div class="auth-page">
    <div class="background-orb orb-left"></div>
    <div class="background-orb orb-right"></div>

    <section class="auth-hero">
      <div class="brand-mark">
        <RocketOutlined />
      </div>
      <span class="eyebrow">AI CODING PLATFORM</span>
      <h1>
        <slot name="hero-title">{{ heroTitle }}</slot>
      </h1>
      <p>{{ heroSubtitle }}</p>
      <div class="feature-list">
        <span><SafetyCertificateOutlined /> 安全可靠</span>
        <span><ThunderboltOutlined /> 高效生成</span>
      </div>
    </section>

    <section class="auth-card">
      <div class="card-heading">
        <span class="welcome">{{ cardEyebrow }}</span>
        <h2>{{ cardTitle }}</h2>
        <p>{{ cardSubtitle }}</p>
      </div>
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录页 / 注册页共用的页面骨架。
 *
 * 两个页面此前是同一套模板与样式复制了两份（左右分栏 + 两枚光斑 + 品牌标语区 +
 * 白底卡片表单），差异只有文案、卡片内边距和表单间距。
 * 这里收成骨架组件，表单由默认插槽传入，页面只写自己的表单项与提交逻辑。
 */
import {
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'

defineProps<{
  /** 左侧大标题：需要换行等自定义内容时改用 #hero-title 插槽 */
  heroTitle?: string
  /** 左侧大标题下方说明 */
  heroSubtitle: string
  /** 卡片顶部英文小标题 */
  cardEyebrow: string
  /** 卡片标题 */
  cardTitle: string
  /** 卡片标题下方说明 */
  cardSubtitle: string
}>()
</script>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  align-items: center;
  gap: clamp(40px, 8vw, 132px);
  min-height: 100%;
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

.auth-hero {
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

.auth-hero h1 {
  max-width: 440px;
  margin: 16px 0;
  color: #172b4d;
  font-weight: 700;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.2;
  letter-spacing: -1.5px;
}

.auth-hero > p {
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

.auth-card {
  padding: 40px 38px 30px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(255 255 255 / 90%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgb(31 73 125 / 13%);
  backdrop-filter: blur(14px);
}

.card-heading {
  margin-bottom: 28px;
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

@media (max-width: 760px) {
  .auth-page {
    display: block;
    min-height: auto;
    max-width: 440px;
    padding: 28px 0 80px;
  }

  .auth-hero {
    margin-bottom: 32px;
  }

  .brand-mark {
    width: 44px;
    height: 44px;
    margin-bottom: 18px;
    border-radius: 13px;
    font-size: 21px;
  }

  .auth-hero h1 {
    max-width: none;
    margin: 10px 0;
    font-size: 32px;
  }

  .auth-hero > p {
    font-size: 14px;
  }

  .feature-list {
    margin-top: 18px;
  }

  .auth-card {
    padding: 32px 26px 26px;
  }
}

@media (max-width: 420px) {
  .feature-list {
    gap: 14px;
    font-size: 13px;
  }

  .auth-card {
    padding: 28px 20px 22px;
    border-radius: 18px;
  }
}
</style>

<!--
  表单由页面通过插槽传入，节点带的是页面的 scopeId，卡片的 scoped 样式命中不了，
  因此卡片内的表单控件样式放在非 scoped 样式块里，用 .auth-card 收敛作用范围。
  提交按钮统一使用 .auth-submit-button 类。
-->
<style>
.auth-card .ant-form-item {
  margin-bottom: 18px;
}

.auth-card .ant-input-affix-wrapper {
  height: 48px;
  padding: 0 14px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
  box-shadow: none;
}

.auth-card .ant-input-affix-wrapper:hover,
.auth-card .ant-input-affix-wrapper-focused {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

.auth-card .ant-input-prefix {
  margin-right: 11px;
  color: #8da0ba;
  font-size: 16px;
}

.auth-card .ant-input {
  background: transparent;
  font-size: 14px;
}

.auth-card .ant-input::placeholder {
  color: #9eabc0;
}

.auth-card .ant-form-item-explain-error {
  padding-top: 4px;
  font-size: 12px;
}

.auth-card .tips {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin: -2px 0 24px;
  color: #8290a4;
  font-size: 13px;
}

.auth-card .tips a {
  color: #1677ff;
  font-weight: 600;
}

.auth-card .submit-item {
  margin-bottom: 0 !important;
}

.auth-card .auth-submit-button {
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

.auth-card .auth-submit-button:hover,
.auth-card .auth-submit-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
  transform: translateY(-1px);
}
</style>
