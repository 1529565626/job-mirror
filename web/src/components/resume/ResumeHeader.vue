<!-- ResumeHeader.vue — 简历头部：姓名/职位/联系方式/摘要 + 精简基本信息 -->
<template>
  <header class="resume-header">
    <h1 class="resume-name">{{ basic.name || '未命名' }}</h1>
    <p class="resume-subtitle">
      <span v-if="basic.currentRole">{{ basic.currentRole }}</span>
      <span v-if="basic.yearsOfExperience" class="dot">·</span>
      <span v-if="basic.yearsOfExperience">{{ basic.yearsOfExperience }}年经验</span>
      <span v-if="basic.industry" class="dot">·</span>
      <span v-if="basic.industry">{{ basic.industry }}</span>
    </p>

    <!-- 精简信息行：学位 + 目标职位 -->
    <p v-if="topDegree || (basic.targetRoles && basic.targetRoles.length)" class="resume-meta-row">
      <span v-if="topDegree" class="meta-item">{{ topDegree }}</span>
      <span v-if="topDegree && basic.targetRoles?.length" class="dot">·</span>
      <span v-if="basic.targetRoles?.length" class="meta-item">求职意向：{{ basic.targetRoles.join(' / ') }}</span>
    </p>

    <!-- 自我评价 -->
    <blockquote v-if="basic.summary" class="resume-summary">{{ basic.summary }}</blockquote>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  basic: { type: Object, default: () => ({}) },
  education: { type: Array, default: () => [] }
})

const topDegree = computed(() => {
  if (!props.education?.length) return ''
  const highest = props.education.sort((a, b) => {
    const order = { '博士': 5, '硕士': 4, 'MBA': 4, '本科': 3, '大专': 2, '高中': 1 }
    return (order[b.degree] || 0) - (order[a.degree] || 0)
  })[0]
  return highest?.degree || ''
})
</script>

<style scoped>
.resume-header { text-align: center; margin-bottom: 1.4rem; }

.resume-name {
  font-family: var(--font-heading);
  font-size: var(--resume-name-size);
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 0.15rem;
  letter-spacing: 0.02em;
}

.resume-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 0.25rem;
}

.resume-meta-row {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0.15rem 0 0;
}

.meta-item { color: var(--color-text-secondary); }
.dot { margin: 0 0.5rem; opacity: 0.4; }
</style>
