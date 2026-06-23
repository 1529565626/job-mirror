<!-- SettingsPopup.vue — 左下角设置弹窗 -->
<template>
  <div class="settings-popup" :class="{ open: showPopup }">
    <button class="gear-btn" @click="showPopup = !showPopup" title="设置">
      ⚙
    </button>
    <div v-if="showPopup" class="popup-panel">
      <label class="debug-row">
        <span class="debug-label">调试模式</span>
        <button
          class="toggle-switch"
          :class="{ on: store.enabled }"
          @click="store.toggle()"
        >
          <span class="toggle-knob"></span>
        </button>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDebugStore } from '@/stores/debug'

const store = useDebugStore()
const showPopup = ref(false)
</script>

<style scoped>
.settings-popup {
  position: fixed;
  left: calc(var(--sidebar-width) + 12px);
  bottom: 12px;
  z-index: 200;
}
.gear-btn {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.gear-btn:hover { color: var(--color-text); border-color: var(--blue); }
.popup-panel {
  position: absolute;
  left: 0;
  bottom: 36px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  box-shadow: var(--shadow-md);
  white-space: nowrap;
}
.debug-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
}
.debug-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.toggle-switch {
  width: 32px; height: 18px;
  border-radius: 9px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.toggle-switch.on { background: var(--blue); }
.toggle-knob {
  position: absolute;
  top: 2px; left: 2px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.toggle-switch.on .toggle-knob { left: 16px; }
</style>
