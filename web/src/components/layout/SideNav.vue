<!-- SideNav.vue — 固定侧边导航 (design-keai App型) -->
<template>
  <nav class="side-nav">
    <ul class="nav-links">
      <li v-for="item in navItems" :key="item.path">
        <RouterLink
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <div class="nav-footer">
      <span class="version">v1.0</span>
    </div>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/', label: '个人档案', icon: '◆' },
  { path: '/jobs', label: '岗位管理', icon: '☰' },
  { path: '/reports', label: '分析报告', icon: '★' }
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<style scoped>
.side-nav {
  position: fixed;
  top: var(--header-height);
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.nav-links {
  flex: 1;
  padding: var(--space-md) var(--space-sm);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 400;
  transition: all 0.15s;
  margin-bottom: 2px;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.nav-link.active {
  background: var(--color-primary-bg);
  color: var(--blue);
  font-weight: 600;
  border-left-color: var(--blue);
}

.nav-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.nav-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.version {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
