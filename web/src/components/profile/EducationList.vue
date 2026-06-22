<!-- EducationList.vue — 教育背景列表 -->
<template>
  <section class="card education-list">
    <h2 class="section-title">
      教育背景
      <span class="count">{{ education.length }} 条</span>
    </h2>
    <div v-if="education.length === 0" class="empty-text">暂无教育背景</div>
    <div v-else class="education-container">
      <EducationItem
        v-for="(edu, index) in education"
        :key="index"
        :education="edu"
      />
    </div>
  </section>
</template>

<script setup>
import EducationItem from './EducationItem.vue'

defineProps({
  education: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.count {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: var(--space-sm);
}

.education-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-lg);
}
</style>
