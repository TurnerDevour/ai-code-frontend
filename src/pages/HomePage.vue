<template>
  <div class="home-page">
    <div class="background-orb orb-left"></div>
    <div class="background-orb orb-right"></div>

    <!-- 标题区 + 提示词输入框 -->
    <section class="hero-section">
      <h1 class="hero-title">
        <span>一句话</span>
        <img class="hero-logo" src="@/assets/logo.png" alt="AI 应用生成平台" />
        <span>呈所想</span>
      </h1>
      <p class="hero-subtitle">与 AI 对话轻松创建应用和网站</p>
      <div class="hero-input">
        <PromptInput
          v-model="initPrompt"
          v-model:code-gen-type="newAppCodeGenType"
          v-model:ai-model-type="newAppAiModelType"
          :loading="creating"
          :presets="PROMPT_PRESETS"
          :maxlength="CHAT_INPUT_MAX_LENGTH"
          placeholder="帮我创建个人博客网站"
          @submit="handleCreateApp"
        />
      </div>
    </section>

    <!-- 我的应用 -->
    <AppSection
      v-model:keyword="mySearch.appName"
      title="我的应用"
      :tip="`共 ${myTotal} 个应用`"
      search-placeholder="搜索我的应用"
      empty-text="还没有应用，输入一句话即可创建"
      :apps="myApps"
      :total="myTotal"
      :page-num="mySearch.pageNum ?? 1"
      :page-size="HOME_PAGE_SIZE"
      :loading="myLoading"
      :can-view-chat="canViewChat"
      :can-delete="isOwner"
      @search="doSearchMy"
      @clear="handleMySearchChange"
      @change-page="handleMyPageChange"
      @view-chat="handleViewChat"
      @deleted="handleAppDeleted"
    />

    <!-- 精选应用 -->
    <AppSection
      v-model:keyword="goodSearch.appName"
      title="精选案例"
      tip="来自社区的优秀作品"
      search-placeholder="搜索精选应用"
      empty-text="暂无精选应用"
      :apps="goodApps"
      :total="goodTotal"
      :page-num="goodSearch.pageNum ?? 1"
      :page-size="HOME_PAGE_SIZE"
      :loading="goodLoading"
      :can-view-chat="canViewChat"
      @search="doSearchGood"
      @clear="handleGoodSearchChange"
      @change-page="handleGoodPageChange"
      @view-chat="handleViewChat"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppSection from '@/components/AppSection.vue'
import PromptInput from '@/components/PromptInput.vue'
import { addApp, listGoodAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import { useAccess } from '@/composables/useAccess'
import { useMessage } from '@/composables/useMessage'
import { usePagedQuery } from '@/composables/usePagedQuery'
import { HOME_PAGE_SIZE, PROMPT_PRESETS } from '@/constant/app'
import { CODE_GEN_TYPE } from '@/constant/codeGenType'
import type { CodeGenType } from '@/constant/codeGenType'
import { AI_MODEL_TYPE } from '@/constant/aiModelType'
import type { AiModelType } from '@/constant/aiModelType'
import { CHAT_INPUT_MAX_LENGTH } from '@/constant/chat.ts'

const router = useRouter()
const { isLoggedIn, isOwner, canViewChat } = useAccess()
const { warning, fail } = useMessage()

const initPrompt = ref('')
// 新建应用时选择的类型（对应后端 AppAddRequest 字段）
const newAppCodeGenType = ref<CodeGenType>(CODE_GEN_TYPE.MULTI_FILE)
const newAppAiModelType = ref<AiModelType>(AI_MODEL_TYPE.DEEPSEEK_V4_1_FLASH)
const creating = ref(false)

// ---- 我的应用 ----
const {
  dataList: myApps,
  total: myTotal,
  loading: myLoading,
  query: mySearch,
  search: doSearchMy,
  changePageNum: handleMyPageChange,
  handleInputClear: handleMySearchChange,
  reloadAfterRemove: reloadMyApps,
} = usePagedQuery<API.AppVO, API.AppQueryRequest>({
  initialQuery: {
    pageNum: 1,
    pageSize: HOME_PAGE_SIZE,
    sortField: 'create_time',
    sortOrder: 'descend',
  },
  pageSize: HOME_PAGE_SIZE,
  showSizeChanger: false,
  failPrefix: '获取我的应用失败',
  // 未登录不请求，与列表为空的表现一致
  beforeLoad: () => isLoggedIn.value,
  fetchPage: (query) => listMyAppVoByPage({ ...query }),
})

// ---- 精选应用 ----
const {
  dataList: goodApps,
  total: goodTotal,
  loading: goodLoading,
  query: goodSearch,
  search: doSearchGood,
  changePageNum: handleGoodPageChange,
  handleInputClear: handleGoodSearchChange,
  reloadAfterRemove: reloadGoodApps,
} = usePagedQuery<API.AppVO, API.AppQueryRequest>({
  initialQuery: {
    pageNum: 1,
    pageSize: HOME_PAGE_SIZE,
    sortField: 'create_time',
    sortOrder: 'descend',
  },
  pageSize: HOME_PAGE_SIZE,
  showSizeChanger: false,
  failPrefix: '获取精选应用失败',
  fetchPage: (query) => listGoodAppVoByPage({ ...query }),
})

// 创建应用并跳转到对话页
const handleCreateApp = async (
  prompt: string,
  options: { codeGenType: CodeGenType; aiModelType: AiModelType },
) => {
  if (!isLoggedIn.value) {
    warning('请先登录')
    await router.push({
      path: '/user/login',
      query: { redirect: '/' },
    })
    return
  }
  creating.value = true
  try {
    const res = await addApp({
      initPrompt: prompt,
      codeGenType: options.codeGenType,
      aiModelType: options.aiModelType,
    })
    const appId = res.data.data
    if (res.data.code === 0 && appId) {
      initPrompt.value = ''
      await router.push({
        path: `/app/chat/${appId}`,
        query: { prompt },
      })
    } else {
      fail('创建应用失败', res.data)
    }
  } finally {
    creating.value = false
  }
}

// 仅创建者可查看自己的对话
const handleViewChat = async (app: API.AppVO) => {
  if (!canViewChat(app)) {
    warning('无权限查看该应用')
    return
  }
  await router.push({
    path: `/app/chat/${app.id}`,
  })
}

// 删除成功后的收尾：应用可能同时出现在「我的应用」和「精选案例」，两块都要刷，否则另一块会残留卡片。
// 用 allSettled 而非 all——任一侧失败都不该影响另一侧已完成的刷新，也不该抛出未处理的拒绝。
const handleAppDeleted = async (app: API.AppVO) => {
  await Promise.allSettled([reloadMyApps(app.id), reloadGoodApps(app.id)])
}
</script>

<style scoped>
.home-page {
  position: relative;
  overflow: hidden;
  max-width: 1382px;
  margin: 0 auto;
}

.background-orb {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(2px);
}

.orb-left {
  width: 360px;
  height: 360px;
  top: -60px;
  left: -200px;
  background: radial-gradient(circle, #dbeafe 0%, rgb(219 234 254 / 0%) 70%);
}

.orb-right {
  width: 420px;
  height: 420px;
  right: -220px;
  top: 80px;
  background: radial-gradient(circle, #d8f7ee 0%, rgb(216 247 238 / 0%) 70%);
}

.hero-section {
  padding: 26px 0 54px;
  text-align: center;
}

.hero-title {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin: 0;
  color: #172b4d;
  font-weight: 800;
  font-size: clamp(36px, 5vw, 60px);
  line-height: 1.25;
  letter-spacing: -2px;
}

.hero-logo {
  width: clamp(52px, 6vw, 74px);
  height: clamp(52px, 6vw, 74px);
  object-fit: contain;
}

.hero-subtitle {
  margin: 16px 0 34px;
  color: #6b7b93;
  font-size: 16px;
}

.hero-input {
  max-width: 860px;
  margin: 0 auto;
}

@media (max-width: 760px) {
  .hero-section {
    padding: 10px 0 38px;
  }
}
</style>
