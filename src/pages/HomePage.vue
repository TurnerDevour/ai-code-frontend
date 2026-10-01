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
          :loading="creating"
          :presets="PROMPT_PRESETS"
          placeholder="使用 NoCode 创建一个高效的小工具，帮我计算......"
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
          <AppCard v-for="app in myApps" :key="app.id" :app="app" @view-chat="handleViewChat" />
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
          <AppCard v-for="app in goodApps" :key="app.id" :app="app" @view-chat="handleViewChat" />
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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PromptInput from '@/components/PromptInput.vue'
import AppCard from '@/components/AppCard.vue'
import { addApp, listGoodAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { HOME_PAGE_SIZE, PROMPT_PRESETS } from '@/constant/app'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const initPrompt = ref('')
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
const handleCreateApp = async (prompt: string) => {
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
    const res = await addApp({ initPrompt: prompt })
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
  window.scrollTo({ top: 0, behavior: 'smooth' })
  message.info('在上方输入框描述你的应用，即可开始创建').then(() => {})
}

// 查看对话：带 view=1 进入对话页，表示只查看、不自动发消息
const handleViewChat = async (app: API.AppVO) => {
  await router.push({
    path: `/app/chat/${app.id}`,
    query: { view: '1' },
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

@media (max-width: 1024px) {
  .app-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
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

  .app-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-title h2 {
    font-size: 24px;
  }
}
</style>
