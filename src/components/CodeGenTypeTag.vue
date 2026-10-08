<template>
  <PillTag
    tone="blue"
    :icon="showIcon ? CodeOutlined : undefined"
    :label="getCodeGenTypeName(codeGenType)"
  />
</template>

<script setup lang="ts">
import { CodeOutlined } from '@ant-design/icons-vue'
import PillTag from '@/components/PillTag.vue'
import { getCodeGenTypeName } from '@/constant/codeGenType'

withDefaults(
  defineProps<{
    /** 代码生成类型（对应后端 CodeGenTypeEnum 的 value） */
    codeGenType?: string
    showIcon?: boolean
  }>(),
  {
    showIcon: false,
  },
)
</script>
