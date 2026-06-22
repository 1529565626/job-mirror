<!-- Suggestions.vue — 简历修改建议列表 -->
<template>
  <section class="card suggestions">
    <h2 class="section-title">简历修改建议</h2>

    <div class="suggestion-list">
      <div
        v-for="(s, i) in sortedSuggestions"
        :key="i"
        class="suggestion-item"
        :class="'priority-' + s.priority"
      >
        <div class="suggestion-header">
          <span class="priority-badge" :class="'badge-' + s.priority">
            {{ priorityLabel(s.priority) }}
          </span>
          <span class="suggestion-section">{{ s.section }}</span>
        </div>
        <p class="suggestion-issue">{{ s.issue }}</p>
        <p class="suggestion-text">{{ s.suggestion }}</p>
        <p class="suggestion-reason">{{ s.reason }}</p>
        <button
          v-if="!props.appliedIndices.includes(i)"
          class="btn-apply"
          @click="emit('apply', i, s.section, s.issue, s.suggestion)"
        >应用</button>
        <button
          v-else
          class="btn-undo-sug"
          @click="emit('undo', i)"
        >撤销</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  suggestions: { type: Array, default: () => [] },
  appliedIndices: { type: Array, default: () => [] }
})

const emit = defineEmits(['apply', 'undo'])

const priorityOrder = { high: 0, medium: 1, low: 2 }

const sortedSuggestions = computed(() =>
  [...props.suggestions].sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))
)

function priorityLabel(p) {
  const map = { high: '高', medium: '中', low: '低' }
  return map[p] || p
}
</script>

<style scoped>
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.suggestion-item {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-border);
}

.priority-high { border-left-color: var(--color-danger); background: var(--color-danger-bg); }
.priority-medium { border-left-color: var(--color-warning); background: var(--color-warning-bg); }
.priority-low { border-left-color: var(--color-primary); background: var(--color-primary-bg); }

.suggestion-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.priority-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.badge-high { background: var(--color-danger); color: #fff; }
.badge-medium { background: var(--color-warning); color: #fff; }
.badge-low { background: var(--color-primary); color: #fff; }

.suggestion-section {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.suggestion-issue {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.suggestion-text {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.5;
  background: var(--color-surface);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.suggestion-reason {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  margin-bottom: var(--space-sm);
}

.btn-apply {
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 4px 12px;
  color: var(--blue);
  background: var(--color-primary-bg);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
}

.btn-apply:hover {
  border-color: var(--blue);
  background: rgba(43, 127, 216, 0.15);
}

.btn-undo-sug {
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 4px 12px;
  color: var(--red);
  background: var(--color-danger-bg);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
}

.btn-undo-sug:hover {
  border-color: var(--red);
  background: rgba(232, 74, 95, 0.12);
}
</style>
