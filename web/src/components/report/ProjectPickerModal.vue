<!-- ProjectPickerModal.vue — 项目选择弹窗 -->
<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card">
        <h3 class="modal-title">选择目标项目</h3>
        <p class="modal-desc">{{ suggestion }}</p>
        <div class="project-list">
          <button
            v-for="p in projects"
            :key="p.name"
            class="project-option"
            @click="$emit('select', p)"
          >
            <span class="proj-name">{{ p.name }}</span>
            <span class="proj-desc">{{ (p.description || '').slice(0, 60) }}{{ (p.description || '').length > 60 ? '...' : '' }}</span>
          </button>
        </div>
        <button class="modal-cancel" @click="$emit('close')">取消</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  projects: { type: Array, default: () => [] },
  suggestion: { type: String, default: '' }
})

defineEmits(['select', 'close'])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 480px;
  width: 90%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,.2);
}
.modal-title {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}
.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  line-height: 1.5;
}
.project-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--space-md);
}
.project-option {
  text-align: left;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  transition: all .15s;
  font-family: var(--font-body);
}
.project-option:hover {
  border-color: var(--blue);
  background: var(--color-primary-bg);
}
.proj-name {
  display: block;
  font-weight: 600;
  color: var(--color-text);
  font-size: var(--text-sm);
  margin-bottom: 2px;
}
.proj-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.modal-cancel {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-sm);
  font-family: var(--font-body);
}
.modal-cancel:hover { color: var(--color-text); }
</style>
