<template>
  <a-tag class="type-tag" :bordered="false">{{ getCodeGenTypeName(codeGenType) }}</a-tag>
</template>

<script setup lang="ts">
import { getCodeGenTypeName } from '@/constant/codeGenType'

defineProps<{
  /** 代码生成类型（对应后端 CodeGenTypeEnum 的 value） */
  codeGenType?: string
}>()
</script>

<style scoped>
.type-tag {
  margin: 0;
  padding: 2px 10px;
  color: #1677ff;
  font-weight: 600;
  font-size: 12px;
  border: 0;
  border-radius: 999px;
  background: #eaf3ff;
  box-shadow: inset 0 0 0 1px #d8e8ff;
}
</style>
