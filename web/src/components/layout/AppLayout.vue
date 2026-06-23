<!-- AppLayout.vue — Sticky Header + 侧栏 + 内容区 (design-keai App型) -->
<template>
  <div class="app-shell">
    <!-- Sticky Header -->
    <header class="app-header">
      <div class="header-brand">
        <span class="brand-mark">Z</span>
        <h1 class="brand-name">职镜</h1>
      </div>
      <div class="header-actions"></div>
    </header>

    <div class="app-body">
      <SideNav />
      <main class="main-content">
        <RouterView />
      </main>
    </div>

    <SettingsPopup />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import SideNav from './SideNav.vue'
import SettingsPopup from './SettingsPopup.vue'
import { useDebugStore } from '@/stores/debug'

const debugStore = useDebugStore()
onMounted(() => debugStore.fetch())
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-bg);
}

/* === Sticky Header === */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.header-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* === Body: 侧栏 + 内容 === */
.app-body {
  display: flex;
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-width: 0;
  overflow-x: hidden;
  padding: var(--space-xl);
}
</style>
