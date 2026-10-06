<template>
  <div class="home-page">
    <div class="background-orb orb-left"></div>
    <div class="background-orb orb-right"></div>

    <!-- 网站标题 + 提示词输入框 -->
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
    <section class="app-section">
      <header class="section-header">
        <div class="section-title">
          <h2>我的应用</h2>
          <span class="section-tip">共 {{ myTotal }} 个应用</span>
        </div>
        <div class="section-actions">
          <a-input
            v-model:value="mySearch.appName"
            class="section-search"
            placeholder="搜索我的应用"
            allow-clear
            @press-enter="doSearchMy"
            @change="handleMySearchChange"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
          <a-button type="primary" class="create-button" @click="handleCreateBlank">
            <PlusOutlined />
            创建应用
          </a-button>
        </div>
      </header>
      <a-spin :spinning="myLoading">
        <div v-if="myApps.length" class="app-grid">
          <AppCard
            v-for="app in myApps"
            :key="app.id"
            :app="app"
            :can-view-chat="canViewChat(app)"
            @view-chat="handleViewChat"
          />
        </div>
        <a-empty v-else class="app-empty" description="还没有应用，输入一句话即可创建" />
      </a-spin>
      <div v-if="myTotal > HOME_PAGE_SIZE" class="pagination-wrapper">
        <a-pagination
          :current="mySearch.pageNum"
          :page-size="HOME_PAGE_SIZE"
          :total="myTotal"
          :show-size-changer="false"
          hide-on-single-page
          @change="handleMyPageChange"
        />
      </div>
    </section>

    <!-- 精选应用 -->
    <section class="app-section">
      <header class="section-header">
        <div class="section-title">
          <h2>精选案例</h2>
          <span class="section-tip">来自社区的优秀作品</span>
        </div>
        <div class="section-actions">
          <a-input
            v-model:value="goodSearch.appName"
            class="section-search"
            placeholder="搜索精选应用"
            allow-clear
            @press-enter="doSearchGood"
            @change="handleGoodSearchChange"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>
      </header>
      <a-spin :spinning="goodLoading">
        <div v-if="goodApps.length" class="app-grid">
          <AppCard
            v-for="app in goodApps"
            :key="app.id"
            :app="app"
            :can-view-chat="canViewChat(app)"
            @view-chat="handleViewChat"
          />
        </div>
        <a-empty v-else class="app-empty" description="暂无精选应用" />
      </a-spin>
      <div v-if="goodTotal > HOME_PAGE_SIZE" class="pagination-wrapper">
        <a-pagination
          :current="goodSearch.pageNum"
          :page-size="HOME_PAGE_SIZE"
          :total="goodTotal"
          :show-size-changer="false"
          hide-on-single-page
          @change="handleGoodPageChange"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PromptInput from '@/components/PromptInput.vue'
import AppCard from '@/components/AppCard.vue'
import { addApp, listGoodAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { HOME_PAGE_SIZE, PROMPT_PRESETS } from '@/constant/app'
import { CODE_GEN_TYPE } from '@/constant/codeGenType'
import type { CodeGenType } from '@/constant/codeGenType'
import { AI_MODEL_TYPE } from '@/constant/aiModelType'
import type { AiModelType } from '@/constant/aiModelType'
import { CHAT_INPUT_MAX_LENGTH } from '@/constant/chat.ts'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const initPrompt = ref('')
// 创建应用时选择的代码生成类型与 AI 模型类型（与后端 AppAddRequest 对应）
const newAppCodeGenType = ref<CodeGenType>(CODE_GEN_TYPE.MULTI_FILE)
const newAppAiModelType = ref<AiModelType>(AI_MODEL_TYPE.DEEPSEEK_FLASH)
const creating = ref(false)

const myApps = ref<API.AppVO[]>([])
const myTotal = ref(0)
const myLoading = ref(false)
const mySearch = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: HOME_PAGE_SIZE,
  sortField: 'create_time',
  sortOrder: 'descend',
})

const goodApps = ref<API.AppVO[]>([])
const goodTotal = ref(0)
const goodLoading = ref(false)
const goodSearch = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: HOME_PAGE_SIZE,
  sortField: 'create_time',
  sortOrder: 'descend',
})

// 创建应用并跳转到对话页
const handleCreateApp = async (
  prompt: string,
  options: { codeGenType: CodeGenType; aiModelType: AiModelType },
) => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser.id) {
    message.warning('请先登录').then(() => {})
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
      message.error('创建应用失败，' + res.data.message).then(() => {})
    }
  } finally {
    creating.value = false
  }
}

const handleCreateBlank = () => {
  const input = document.querySelector<HTMLTextAreaElement>('.prompt-textarea textarea')
  input?.focus()
  // 现在只有中间内容区滚动，回到顶部要作用在该容器上
  document.querySelector<HTMLElement>('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  message.info('在上方输入框描述你的应用，即可开始创建').then(() => {})
}

// 是否为当前登录用户自己创建的应用：
// 创建者 id（app.user.id）与登录者 id 不一致时不允许查看对话
const canViewChat = (app: API.AppVO) => {
  const loginUserId = loginUserStore.loginUser.id
  const creatorId = app.user?.id
  // 任一侧 id 缺失时不拦截（与改动前一致，避免后端未返回 user 时按钮永久禁用）
  if (!loginUserId || !creatorId) {
    return true
  }
  return String(creatorId) === String(loginUserId)
}

// 查看对话：先校验创建者与当前登录者是否为同一人，通过后才进入对话页
const handleViewChat = async (app: API.AppVO) => {
  if (!canViewChat(app)) {
    message.warning('无权限查看该应用').then(() => {})
    return
  }
  await router.push({
    path: `/app/chat/${app.id}`,
  })
}

// 我的应用列表
const fetchMyApps = async () => {
  if (!loginUserStore.loginUser.id) {
    myApps.value = []
    myTotal.value = 0
    return
  }
  myLoading.value = true
  try {
    const res = await listMyAppVoByPage({ ...mySearch })
    if (res.data.code === 0 && res.data.data) {
      myApps.value = res.data.data.records ?? []
      myTotal.value = Number(res.data.data.totalRow ?? 0)
    } else {
      message.error('获取我的应用失败，' + res.data.message).then(() => {})
    }
  } finally {
    myLoading.value = false
  }
}

const doSearchMy = () => {
  mySearch.pageNum = 1
  fetchMyApps()
}

// 输入框清空时立即刷新
const handleMySearchChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.value) {
    doSearchMy()
  }
}

const handleMyPageChange = (page: number) => {
  mySearch.pageNum = page
  fetchMyApps()
}

// 精选应用列表
const fetchGoodApps = async () => {
  goodLoading.value = true
  try {
    const res = await listGoodAppVoByPage({ ...goodSearch })
    if (res.data.code === 0 && res.data.data) {
      goodApps.value = res.data.data.records ?? []
      goodTotal.value = Number(res.data.data.totalRow ?? 0)
    } else {
      message.error('获取精选应用失败，' + res.data.message).then(() => {})
    }
  } finally {
    goodLoading.value = false
  }
}

const doSearchGood = () => {
  goodSearch.pageNum = 1
  fetchGoodApps()
}

const handleGoodSearchChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.value) {
    doSearchGood()
  }
}

const handleGoodPageChange = (page: number) => {
  goodSearch.pageNum = page
  fetchGoodApps()
}

onMounted(() => {
  fetchMyApps()
  fetchGoodApps()
})
</script>

<style scoped>
.home-page {
  position: relative;

  /* 装饰光斑按设计溢出到页面外侧（orb-right 的 right: -220px），必须在这里裁掉，
     否则会溢进 main-content 的可滚动区域，
     在 1280~1600 这类笔记本宽度下常驻一条横向滚动条 */
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

.app-section {
  margin-bottom: 54px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 22px;
}

.section-title h2 {
  margin: 0 0 6px;
  color: #172b4d;
  font-weight: 800;
  font-size: 30px;
  letter-spacing: -0.8px;
}

.section-tip {
  color: #8190a5;
  font-size: 13px;
}

.section-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.section-search {
  width: 240px;
  height: 38px;
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
}

.section-search :deep(.ant-input) {
  background: transparent;
}

.section-search :deep(.ant-input-prefix) {
  margin-right: 8px;
  color: #8da0ba;
}

.create-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 38px;
  padding: 0 18px;
  font-weight: 600;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 7px 15px rgb(40 96 224 / 20%);
}

.create-button:hover,
.create-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
}

.app-grid {
  display: grid;

  /* 单列宽度上限 440px：应用只有 1~2 个时，卡片不会被拉伸成细长条。
     列数与列宽由下面的媒体查询接管，容器内没有余量，左边缘始终与标题对齐 */
  grid-template-columns: repeat(2, minmax(0, 440px));
  gap: 24px;
}

.app-empty {
  padding: 36px 0;
  background: rgb(255 255 255 / 70%);
  border: 1px dashed #e2ecf9;
  border-radius: 18px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

/* 宽屏：每行 3 列（与设计稿一致），单列最多 440px */
@media (min-width: 1200px) {
  .app-grid {
    grid-template-columns: repeat(3, minmax(0, 440px));
  }
}

/* 手机：单列 */
@media (max-width: 760px) {
  .app-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-section {
    padding: 10px 0 38px;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .section-actions {
    flex-wrap: wrap;
  }

  .section-search {
    flex: 1;
    width: auto;
  }

  .section-title h2 {
    font-size: 24px;
  }
}
</style>
