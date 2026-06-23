<!-- JDItem.vue — 单个岗位卡片 -->
<template>
  <div class="card jd-item" @click="goDetail">
    <div class="jd-header">
      <h3 class="jd-title">{{ jd.title || jd.id }}</h3>
      <button class="btn-delete" @click.stop="$emit('delete')" title="删除岗位">×</button>
    </div>
    <div class="jd-meta">
      <span v-if="jd.createdAt" class="jd-date">{{ formatDate(jd.createdAt) }}</span>
      <span v-if="jd.overallScore != null" class="jd-score" :class="scoreClass(jd.overallScore)">
        {{ jd.overallScore }}%
      </span>
      <span v-else-if="!jd.corrupted" class="jd-badge badge-pending">待分析</span>
      <span v-if="jd.corrupted" class="jd-badge badge-corrupt">文件损坏</span>
    </div>
    <div v-if="!jd.overallScore && !jd.corrupted" class="jd-actions">
      <button class="btn-analyze" @click.stop="$emit('analyze', jd.id)">开始分析</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  jd: {
    type: Object,
    required: true
  }
})

defineEmits(['delete', 'analyze'])

const router = useRouter()

function goDetail() {
  router.push(`/jobs/${props.jd.id}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function scoreClass(score) {
  if (score >= 80) return 'score-high'
  if (score >= 50) return 'score-medium'
  if (score >= 30) return 'score-low'
  return 'score-critical'
}
</script>

<style scoped>
.jd-item {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.jd-item:hover {
  box-shadow: var(--shadow-md);
}

.jd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
}

.jd-title {
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

.jd-meta {
  margin-top: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.jd-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.jd-score {
  font-size: var(--text-sm);
  font-weight: 600;
}

.jd-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 3px;
}
.badge-pending { background: rgba(245,158,11,0.12); color: var(--amber, #f59e0b); }
.badge-corrupt { background: rgba(239,68,68,0.12); color: var(--red, #ef4444); }

.jd-actions { margin-top: var(--space-sm); }
.btn-analyze {
  font-size: var(--text-xs);
  color: #fff;
  background: var(--blue);
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 16px;
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-body);
  transition: opacity 0.15s;
}
.btn-analyze:hover { opacity: 0.85; }
</style>
