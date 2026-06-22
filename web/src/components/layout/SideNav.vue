<!-- SideNav.vue — 固定侧边导航 + 任务指示器 -->
<template>
  <nav class="side-nav">
    <ul class="nav-links">
      <li v-for="item in navItems" :key="item.path">
        <RouterLink :to="item.path" class="nav-link" :class="{ active: isActive(item.path) }">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <!-- 运行中任务 -->
    <div v-if="tasks.length" class="nav-tasks">
      <p class="tasks-title"><span class="pulse-dot"></span>执行中 ({{ tasks.length }})</p>
      <div v-for="t in tasks" :key="t.label" class="task-mini">
        <span class="task-type">{{ t.type }}</span>
        <span class="task-current">{{ t.current || '处理中…' }}</span>
      </div>
    </div>

    <div class="nav-footer">
      <span class="version">v1.0</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'

const route = useRoute()
const tasks = ref([])
let timer = null

const navItems = [
  { path: '/', label: '个人档案', icon: '◆' },
  { path: '/jobs', label: '岗位管理', icon: '☰' },
  { path: '/reports', label: '分析报告', icon: '★' }
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

async function pollTasks() {
  try { tasks.value = await api.get('/api/tasks') || [] } catch {}
}

onMounted(() => { pollTasks(); timer = setInterval(pollTasks, 3000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.side-nav { position: fixed; top: var(--header-height); left: 0; bottom: 0; width: var(--sidebar-width); background: var(--color-surface); border-right: 1px solid var(--color-border); display: flex; flex-direction: column; overflow-y: auto; }
.nav-links { flex: 1; padding: var(--space-md) var(--space-sm); }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-size: 0.9rem; font-weight: 400; transition: all 0.15s; margin-bottom: 2px; border-left: 3px solid transparent; }
.nav-link:hover { background: var(--color-bg); color: var(--color-text); }
.nav-link.active { background: var(--color-primary-bg); color: var(--blue); font-weight: 600; border-left-color: var(--blue); }
.nav-icon { font-size: 1.1rem; width: 24px; text-align: center; flex-shrink: 0; }

/* 任务指示器 */
.nav-tasks { padding: var(--space-sm) var(--space-md); border-top: 1px solid var(--color-border); margin: 0 var(--space-sm); }
.tasks-title { font-size: 0.7rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: var(--space-xs); display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); display: inline-block; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.task-mini { padding: 4px 0; }
.task-type { font-size: 0.7rem; font-weight: 600; color: var(--blue); }
.task-current { font-size: 0.65rem; color: var(--color-text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.nav-footer { padding: var(--space-md) var(--space-lg); border-top: 1px solid var(--color-border); }
.version { font-size: var(--text-xs); color: var(--color-text-muted); }
</style>
