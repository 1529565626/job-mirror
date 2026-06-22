<!-- ProgressBar.vue — 通用进度条 -->
<template>
  <div class="progress-bar">
    <div class="progress-header">
      <span v-if="label" class="progress-label">{{ label }}</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{
          width: clampValue + '%',
          backgroundColor: color
        }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0
  },
  label: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'var(--color-primary)'
  }
})

const clampValue = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<style scoped>
.progress-bar {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.progress-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 0;
}
</style>
