<!-- ExperienceList.vue — 项目/工作经历列表 -->
<template>
  <section class="card experience-list">
    <h2 class="section-title">
      工作经历
      <span class="count">{{ experiences.length }} 段</span>
    </h2>
    <div v-if="experiences.length === 0" class="empty-text">暂无工作经历</div>
    <div v-else class="experiences-container">
      <ExperienceItem
        v-for="(exp, index) in experiences"
        :key="index"
        :experience="exp"
        :index="index"
        @polish="(e) => $emit('polish', { ...e, index })"
      />
    </div>
  </section>
</template>

<script setup>
import ExperienceItem from './ExperienceItem.vue'

defineProps({
  experiences: {
    type: Array,
    default: () => []
  }
})
defineEmits(['polish'])
</script>

<style scoped>
.count {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: var(--space-sm);
  font-family: var(--font-body);
}

.experiences-container {
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
