<!-- ReportItem.vue — 单个报告摘要卡片 -->
<template>
  <div class="card report-item" @click="goDetail">
    <div class="report-header">
      <h3 class="report-title">{{ report.title || report.id }}</h3>
      <button class="btn-delete" @click.stop="$emit('delete')" title="删除报告">×</button>
    </div>

    <div class="report-body">
      <div class="score-section">
        <span class="score-label">综合匹配度</span>
        <span class="score-value" :class="scoreClass">{{ report.overallScore ?? '--' }}%</span>
      </div>

      <div class="report-meta">
        <span v-if="report.createdAt">{{ formatDate(report.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})

defineEmits(['delete'])

const router = useRouter()

const scoreClass = computed(() => {
  const s = props.report.overallScore
  if (s >= 80) return 'score-high'
  if (s >= 50) return 'score-medium'
  if (s >= 30) return 'score-low'
  return 'score-critical'
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function goDetail() {
  router.push(`/reports/${props.report.id}`)
}
</script>

<style scoped>
.report-item {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.report-item:hover {
  box-shadow: var(--shadow-md);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
}

.report-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.btn-delete {
  font-size: var(--text-xl);
  color: var(--color-text-muted);
  padding: 0 var(--space-xs);
  transition: color 0.15s;
}

.btn-delete:hover {
  color: var(--color-danger);
}

.report-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-sm);
}

.score-section {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.score-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.score-value {
  font-size: var(--text-2xl);
  font-weight: 700;
}

.report-meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
