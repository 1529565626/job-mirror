<!-- ProjectList.vue — 项目经历列表 -->
<template>
  <section class="card project-list">
    <h2 class="section-title">
      项目经历
      <span class="count">{{ projects.length }} 项</span>
    </h2>
    <div v-if="projects.length === 0" class="empty-text">暂无项目经历</div>
    <div v-else class="projects-container">
      <ProjectItem
        v-for="(proj, index) in projects"
        :key="index"
        :project="proj"
        :index="index"
        @polish="(e) => $emit('polish', { ...e, index })"
      />
    </div>
  </section>
</template>

<script setup>
import ProjectItem from './ProjectItem.vue'

defineProps({
  projects: {
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

.projects-container {
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
