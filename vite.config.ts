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
      // 编辑器保存文件时会先在源码目录创建 .xxx.tmpdir 临时目录，
      // chokidar 监听这些转瞬即逝的路径会抛 EBUSY 并直接打挂 dev server，
      // 因此忽略这类临时目录（不忽略 .env* 等点文件，环境变量改动仍能触发热重启）
      ignored: ['**/.*.tmpdir', '**/.*.tmpdir/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8123',
        changeOrigin: true,
        secure: false, // 如果是https接口，需要配置这个参数
      },
    },
  },
})
