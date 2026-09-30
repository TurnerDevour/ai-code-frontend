import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import './permission.ts'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

router.isReady().then(() => {
  app.mount('#app')
})
