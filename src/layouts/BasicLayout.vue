<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalFooter from '../components/GlobalFooter.vue'
import GlobalHeader from '../components/GlobalHeader.vue'

const route = useRoute()
// 对话页需要铺满视口，不展示底部版权信息
const showFooter = computed(() => !route.meta.hideFooter)
</script>

<template>
  <a-layout class="basic-layout">
    <!-- 头部导航 -->
    <GlobalHeader v-if="!route.meta.hideHeader" />

    <!-- 内容区域 -->
    <a-layout-content class="main-content" :class="{ 'is-fullscreen': route.meta.hideFooter }">
      <RouterView />
    </a-layout-content>

    <!-- 底部版权信息 -->
    <GlobalFooter v-if="showFooter" />
  </a-layout>
</template>

<style scoped>
/* 应用外壳：占满整屏高度，只有中间内容区滚动，头部与底部保持不动 */
.basic-layout {
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;

  /* 宽度交给 flex：不能写 max-width: 99% 之类的百分比宽度，
     否则可用宽度比视口少 1%，内容顶到右边界就会常驻横向滚动条 */
  width: 100%;
  max-width: 100%;
  padding: clamp(16px, 1.8vw, 24px);
  margin: 0 auto;

  /* 纵向滚动由内容区承担；横向一律隐藏，避免光斑等装饰元素撑出横向滚动条 */
  overflow-x: hidden;
  overflow-y: auto;
}

/* 对话页等铺满视口的页面：内容自己内部滚动，外层不再出现滚动条 */
.main-content.is-fullscreen {
  max-width: 100%;
  padding: 0;
  overflow: hidden;
}
</style>
