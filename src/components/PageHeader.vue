<template>
  <div class="page-header">
    <div class="page-header-main">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="icon" class="header-icon">
      <component :is="icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  /** 标题上方的英文小标题 */
  eyebrow?: string
  title: string
  description?: string
  icon?: Component
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 28px;
}

.page-header-main {
  min-width: 0;
}

.eyebrow {
  display: block;
  color: #5375a4;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1.6px;
}

.page-header h1 {
  margin: 8px 0 7px;
  color: #172b4d;
  font-size: 28px;
  line-height: 1.3;
}

.page-header p {
  margin: 0;
  color: #8190a5;
  font-size: 14px;
}

.header-icon {
  display: grid;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  color: #fff;
  font-size: 23px;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #1677ff, #6d5dfc);
  box-shadow: 0 12px 28px rgb(54 103 210 / 25%);
}

@media (max-width: 760px) {
  .page-header {
    margin-top: 0;
  }
}

@media (max-width: 480px) {
  .header-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: 13px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .page-header p {
    max-width: 240px;
  }
}
</style>
