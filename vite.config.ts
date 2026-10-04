import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // 编辑器的原子写入会在源码目录里创建 .xxx.tmpdir 临时目录，
      // chokidar 监听这些转瞬即逝的路径会抛 EBUSY 并直接打挂 dev server
      ignored: ['**/.*', '**/.*/**'],
    },
  },
})
