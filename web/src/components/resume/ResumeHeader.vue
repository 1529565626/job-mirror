<!-- ResumeHeader.vue — 简历头部：姓名 / 职位 / 摘要 -->
<template>
  <header class="resume-header">
    <h1 class="resume-name">{{ basic.name || '未命名' }}</h1>
    <p v-if="subtitle" class="resume-subtitle">{{ subtitle }}</p>
    <blockquote v-if="basic.summary" class="resume-summary">{{ basic.summary }}</blockquote>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  basic: { type: Object, default: () => ({}) }
})

const subtitle = computed(() => {
  const parts = [
    props.basic.currentRole,
    props.basic.yearsOfExperience ? `${props.basic.yearsOfExperience}年经验` : '',
    props.basic.industry
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : ''
})
</script>

<style scoped>
.resume-header {
  text-align: center;
  margin-bottom: 1.2rem;
}

.resume-name {
  font-family: var(--font-heading);
  font-size: var(--resume-name-size);
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 0.25rem;
  letter-spacing: 0.02em;
}

.resume-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
