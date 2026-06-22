<!-- EducationItem.vue — 单条教育背景 -->
<template>
  <div class="education-item">
    <h3 class="edu-school">{{ education.school }}</h3>
    <div class="edu-detail">
      <span>{{ education.degree }}</span>
      <span class="edu-sep">·</span>
      <span>{{ education.major }}</span>
      <span class="edu-sep">·</span>
      <span>{{ education.graduationYear }} 年毕业</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  education: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.education-item {
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.edu-school {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.edu-detail {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.edu-sep {
  color: var(--color-text-muted);
}
</style>
