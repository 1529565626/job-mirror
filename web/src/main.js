// main.js — 职镜 Vue 3 SPA 入口
// 挂载 Vue + Router + Pinia，导入全局样式
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/reset.css'
import './styles/variables.css'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
