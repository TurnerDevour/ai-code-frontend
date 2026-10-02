<template>
  <div class="app-edit-page">
    <PageHeader
      eyebrow="APPLICATION SETTINGS"
      title="应用信息修改"
      :description="
        isAdmin ? '管理员可修改应用名称、应用封面与优先级。' : '普通用户仅支持修改自己的应用名称。'
      "
      :icon="SettingOutlined"
    />

    <a-spin :spinning="loading">
      <section class="form-panel">
        <a-form
          :model="formState"
          :label-col="{ span: 4 }"
          :wrapper-col="{ span: 18 }"
          @finish="handleSubmit"
        >
          <a-form-item label="应用 id">
            <a-input :value="appId" disabled />
          </a-form-item>
          <a-form-item
            label="应用名称"
            name="appName"
            :rules="[
              { required: true, message: '请输入应用名称' },
              { max: 50, message: '应用名称不能大于 50 位' },
            ]"
          >
            <a-input v-model:value="formState.appName" placeholder="请输入应用名称" allow-clear />
          </a-form-item>

          <!-- 仅管理员可修改 -->
          <template v-if="isAdmin">
            <a-form-item label="应用封面" name="cover">
              <a-input v-model:value="formState.cover" placeholder="请输入应用封面图片链接" />
            </a-form-item>
            <a-form-item label="封面预览">
              <div class="cover-preview">
                <img v-if="formState.cover" :src="formState.cover" alt="应用封面" />
                <div v-else class="cover-empty">
                  <PictureOutlined />
                  <span>暂无封面</span>
                </div>
              </div>
            </a-form-item>
            <a-form-item label="优先级" name="priority">
              <a-select
                v-model:value="formState.priority"
                class="priority-select"
                :options="priorityOptions"
                placeholder="请选择优先级"
              />
              <span class="field-tip">
                优先级为 {{ GOOD_APP_PRIORITY }} 时，该应用将展示在首页「精选案例」中
              </span>
            </a-form-item>
          </template>

          <a-form-item label="初始化提示词">
            <a-textarea :value="app.initPrompt" :rows="3" disabled />
          </a-form-item>

          <a-form-item :wrapper-col="{ offset: 4, span: 18 }">
            <a-space :size="12">
              <a-button type="primary" html-type="submit" :loading="submitting" class="save-button">
                保存
              </a-button>
              <a-button @click="handleBack">返回</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </section>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PictureOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { getAppVoById, getAppVoByIdByAdmin, updateApp, updateAppByAdmin } from '@/api/appController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import PageHeader from '@/components/PageHeader.vue'
import { ACCESS } from '@/constant/access'
import { APP_PRIORITY_OPTIONS, GOOD_APP_PRIORITY } from '@/constant/app'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const submitting = ref(false)
const app = ref<API.AppVO>({})

const isAdmin = computed(() => loginUserStore.loginUser.userRole === ACCESS.ADMIN)

const formState = reactive<{
  appName: string
  cover?: string
  priority?: number
}>({
  appName: '',
  cover: '',
  priority: 0,
})

// 优先级选项：以常量中的两个优先级为准；存量应用若使用了自定义优先级，则额外附上以免显示成裸数字
const priorityOptions = computed(() => {
  const options = [...APP_PRIORITY_OPTIONS]
  const current = formState.priority
  if (current !== undefined && !options.some((option) => option.value === current)) {
    options.push({ label: `自定义（${current}）`, value: current })
  }
  return options
})

// 获取应用信息，管理员使用管理员接口
const fetchApp = async () => {
  if (!appId.value) {
    return
  }
  loading.value = true
  try {
    const res = isAdmin.value
      ? await getAppVoByIdByAdmin({ id: appId.value })
      : await getAppVoById({ id: appId.value })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data
      const loginUserId = loginUserStore.loginUser.id
      // 普通用户只能编辑自己的应用
      if (!isAdmin.value && String(app.value.userId) !== String(loginUserId)) {
        message.error('没有权限修改该应用').then(() => {})
        await router.replace('/')
        return
      }
      formState.appName = app.value.appName ?? ''
      formState.cover = app.value.cover ?? ''
      formState.priority = app.value.priority ?? 0
    } else {
      message.error('获取应用信息失败，' + res.data.message).then(() => {})
    }
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formState.appName.trim()) {
    message.warning('请输入应用名称').then(() => {})
    return
  }
  submitting.value = true
  try {
    const res = isAdmin.value
      ? await updateAppByAdmin({
          id: appId.value,
          appName: formState.appName,
          cover: formState.cover,
          priority: formState.priority,
        })
      : await updateApp({ id: appId.value, appName: formState.appName })
    if (res.data.code === 0) {
      message.success('保存成功').then(() => {})
      handleBack()
    } else {
      message.error('保存失败，' + res.data.message).then(() => {})
    }
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

onMounted(() => {
  fetchApp()
})
</script>

<style scoped>
.app-edit-page {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.form-panel {
  padding: 32px 28px 12px;
  background: rgb(255 255 255 / 90%);
  border: 1px solid #edf2fa;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(31 73 125 / 7%);
}

.form-panel :deep(.ant-form-item-label > label) {
  color: #5e6f88;
  font-size: 13px;
}

.form-panel :deep(.ant-input),
.form-panel :deep(.ant-input-affix-wrapper),
.form-panel :deep(.ant-select .ant-select-selector) {
  background: #f7f9fc;
  border-color: transparent;
  border-radius: 10px;
}

.form-panel :deep(.ant-input:hover),
.form-panel :deep(.ant-input-affix-wrapper:hover),
.form-panel :deep(.ant-input:focus),
.form-panel :deep(.ant-input-affix-wrapper-focused),
.form-panel :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector),
.form-panel :deep(.ant-select-focused .ant-select-selector) {
  background: #fff;
  border-color: #91caff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 10%);
}

.cover-preview {
  display: grid;
  width: 100%;
  max-width: 420px;
  height: 180px;
  overflow: hidden;
  border: 1px dashed #dbe6f5;
  border-radius: 14px;
  place-items: center;
  background: #f7f9fc;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.cover-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  color: #9aa9bf;
  font-size: 13px;
}

.cover-empty :deep(.anticon) {
  font-size: 24px;
}

.priority-select {
  width: 180px;
}

.field-tip {
  margin-left: 12px;
  color: #8190a5;
  font-size: 12px;
}

.save-button {
  min-width: 96px;
  font-weight: 600;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(105deg, #1677ff, #5e63f2);
  box-shadow: 0 7px 15px rgb(40 96 224 / 20%);
}

.save-button:hover,
.save-button:focus {
  background: linear-gradient(105deg, #3b8cff, #7175ff) !important;
}

@media (max-width: 760px) {
  .form-panel {
    padding: 24px 16px 8px;
  }

  .field-tip {
    display: block;
    margin: 8px 0 0;
  }
}
</style>
