<!-- Suggestions.vue — 简历修改建议列表（支持 Before/After 对比 + ATS 检查） -->
<template>
  <section class="card suggestions">
    <h2 class="section-title">简历修改建议</h2>

    <div v-if="!sortedSuggestions.length" class="sug-empty">暂无修改建议</div>

    <div class="suggestion-list">
      <div
        v-for="(s, i) in sortedSuggestions"
        :key="i"
        class="suggestion-item"
        :class="[s.section === 'ATS兼容性' ? 'ats-item' : '', 'priority-' + s.priority]"
      >
        <div class="suggestion-header">
          <span class="priority-badge" :class="'badge-' + s.priority">
            {{ priorityLabel(s.priority) }}
          </span>
          <span class="suggestion-section">
            {{ s.section === 'ATS兼容性' ? '⚠️  ATS 兼容性' : s.section }}
          </span>
        </div>

        <p class="suggestion-issue">{{ s.issue }}</p>

        <!-- Before/After 对比模式（新格式） -->
        <div v-if="isStructuredSuggestion(s.suggestion)" class="before-after">
          <div class="ba-columns">
            <div class="ba-col ba-before">
              <span class="ba-label">原文</span>
              <div class="ba-text">{{ s.suggestion.before }}</div>
            </div>
            <div class="ba-col ba-after">
              <span class="ba-label">改写后</span>
              <div class="ba-text">{{ s.suggestion.after }}</div>
            </div>
          </div>
          <div v-if="s.suggestion.formula" class="ba-formula">
            改写公式：{{ s.suggestion.formula }}
          </div>
          <div v-if="s.suggestion.note" class="ba-note">⚠️ {{ s.suggestion.note }}</div>
        </div>

        <!-- 纯文本模式（旧格式兼容） -->
        <p v-else class="suggestion-text">{{ s.suggestion }}</p>

        <p class="suggestion-reason">{{ s.reason }}</p>

        <!-- ATS 建议不可"应用"，仅作提示 -->
        <button
          v-if="s.section !== 'ATS兼容性' && !props.appliedIndices.includes(i)"
          class="btn-apply"
          @click="emit('apply', i, s.section, s.issue, flatSuggestion(s.suggestion))"
        >应用</button>
        <button
          v-else-if="s.section !== 'ATS兼容性' && props.appliedIndices.includes(i)"
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

function isStructuredSuggestion(sug) {
  return sug && typeof sug === 'object' && 'before' in sug && 'after' in sug
}

function flatSuggestion(sug) {
  if (isStructuredSuggestion(sug)) return sug.after || sug.before || ''
  return typeof sug === 'string' ? sug : ''
}

function priorityLabel(p) {
  const map = { high: '高', medium: '中', low: '低' }
  return map[p] || p
}
</script>

<style scoped>
.sug-empty { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-lg); }

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

.ats-item {
  border-left-color: var(--yellow);
  background: rgba(244, 215, 88, 0.06);
}

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

/* Before/After 双栏 */
.before-after {
  margin: var(--space-sm) 0;
}

.ba-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.ba-col {
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
}

.ba-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
  text-transform: uppercase;
}

.ba-before .ba-label { color: var(--color-text-muted); }
.ba-after .ba-label { color: var(--color-success); }

.ba-text {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}

.ba-formula {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.ba-note {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--color-warning);
  font-style: italic;
}

/* 旧格式纯文本 */
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

.btn-apply, .btn-undo-sug {
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
  border: 1px solid transparent;
}

.btn-apply {
  color: var(--blue);
  background: var(--color-primary-bg);
}

.btn-apply:hover {
  border-color: var(--blue);
  background: rgba(43, 127, 216, 0.15);
}

.btn-undo-sug {
  color: var(--red);
  background: var(--color-danger-bg);
}

.btn-undo-sug:hover {
  border-color: var(--red);
  background: rgba(232, 74, 95, 0.12);
}
</style>
