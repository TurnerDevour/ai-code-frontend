<script setup lang="ts">
import GlobalFooter from '../components/GlobalFooter.vue'
import GlobalHeader from '../components/GlobalHeader.vue'
</script>

<template>
  <a-layout class="basic-layout">
    <!-- 头部导航 -->
    <GlobalHeader />

    <!-- 内容区域 -->
    <a-layout-content class="main-content">
      <RouterView />
    </a-layout-content>

    <!-- 底部版权信息 -->
    <GlobalFooter />
  </a-layout>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
