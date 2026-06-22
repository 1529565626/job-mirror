// vite.config.js — 职镜前端构建配置
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      // 开发环境代理到文件服务
      '/api': 'http://localhost:3099'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
