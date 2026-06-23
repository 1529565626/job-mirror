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

    <!-- 报告详情快捷导航（仅报告详情页显示） -->
    <div v-if="isReportDetail" class="nav-sub">
      <p class="nav-sub-title">本页模块</p>
      <a v-for="item in reportAnchors" :key="item.id" class="nav-sub-link" :class="{ active: activeAnchor === item.id }" @click.prevent="scrollToAnchor(item.id)">{{ item.label }}</a>
    </div>

    <!-- 运行中任务 -->
    <div v-if="tasks.length" class="nav-tasks">
      <p class="tasks-title"><span class="pulse-dot"></span>执行中 ({{ tasks.length }})</p>
      <div v-for="t in tasks" :key="t.label" class="task-mini">
        <span class="task-type">{{ t.type }}</span>
        <span class="task-current">{{ t.current || '处理中…' }}</span>
      </div>
    </div>

    <div class="nav-footer">
      <span class="version">JobMirror v1.0</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { useDebugStore } from '@/stores/debug'

const route = useRoute()
const debugStore = useDebugStore()
const tasks = ref([])
let timer = null

const isReportDetail = computed(() => route.name === 'report-detail')

const reportAnchors = [
  { id: 'sec-score', label: '匹配度评分' },
  { id: 'sec-skills', label: '技能雷达图' },
  { id: 'sec-breakdown', label: '技能匹配详情' },
  { id: 'sec-suggestions', label: '简历修改建议' },
  { id: 'sec-interview', label: '面试准备' }
]

const allItems = [
  { path: '/', label: '个人档案', icon: '◆' },
  { path: '/jobs', label: '岗位管理', icon: '☰' },
  { path: '/compare', label: '岗位对比', icon: '⇔' },
  { path: '/reports', label: '分析报告', icon: '★' },
  { path: '/logs', label: '执行日志', icon: '◷', debugOnly: true }
]

const navItems = computed(() =>
  allItems.filter(item => !item.debugOnly || debugStore.enabled)
)

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

async function pollTasks() {
  try { tasks.value = await api.get('/api/tasks') || [] } catch {}
}

const activeAnchor = ref('')

function scrollToAnchor(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 监听滚动，高亮当前可见模块
let observer = null
function setupAnchorObserver() {
  if (!isReportDetail.value) { activeAnchor.value = ''; return }
  const container = document.querySelector('.report-left')
  if (!container) return
  const ids = reportAnchors.map(a => a.id)
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { activeAnchor.value = e.target.id; break }
    }
  }, { root: container, threshold: 0.3 })
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
}

onMounted(() => {
  pollTasks(); timer = setInterval(pollTasks, 3000)
  setTimeout(setupAnchorObserver, 500)
})
watch(() => route.params.id, () => {
  if (observer) observer.disconnect()
  setTimeout(setupAnchorObserver, 600)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.side-nav { position: fixed; top: var(--header-height); left: 0; bottom: 0; width: var(--sidebar-width); background: var(--color-surface); border-right: 1px solid var(--color-border); display: flex; flex-direction: column; overflow-y: auto; }
.nav-links { flex: 1; padding: var(--space-md) var(--space-sm); }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-size: 0.9rem; font-weight: 400; transition: all 0.15s; margin-bottom: 2px; border-left: 3px solid transparent; }
.nav-link:hover { background: var(--color-bg); color: var(--color-text); }
.nav-link.active { background: var(--color-primary-bg); color: var(--blue); font-weight: 600; border-left-color: var(--blue); }
.nav-icon { font-size: 1.1rem; width: 24px; text-align: center; flex-shrink: 0; }

/* 报告快捷导航 */
.nav-sub {
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--color-border);
  margin: 0 var(--space-sm);
  background: rgba(43, 127, 216, 0.03);
  border-radius: var(--radius-sm);
}
.nav-sub-title {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.nav-sub-link {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.12s;
  cursor: pointer;
}
.nav-sub-link:hover {
  color: var(--blue);
  background: var(--color-primary-bg);
}
.nav-sub-link.active {
  color: var(--blue);
  background: var(--color-primary-bg);
  font-weight: 600;
}

/* 任务指示器 */
.nav-tasks { padding: var(--space-sm) var(--space-md); border-top: 1px solid var(--color-border); margin: 0 var(--space-sm); }
.tasks-title { font-size: 0.7rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: var(--space-xs); display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); display: inline-block; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.task-mini { padding: 4px 0; }
.task-type { font-size: 0.7rem; font-weight: 600; color: var(--blue); }
.task-current { font-size: 0.65rem; color: var(--color-text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.nav-footer { padding: var(--space-md) var(--space-lg) var(--space-md) 44px; border-top: 1px solid var(--color-border); }
.version { font-size: var(--text-xs); color: var(--color-text-muted); }
</style>
