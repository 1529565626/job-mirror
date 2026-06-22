<!-- ProjectItem.vue — 单段项目经历 (design-keai) -->
<template>
  <div class="project-item">
    <div class="project-header">
      <h3 class="project-name">{{ project.name }}</h3>
      <span v-if="project.role" class="project-role">{{ project.role }}</span>
    </div>
    <div class="project-meta">
      <span v-if="project.duration" class="project-duration">
        {{ project.duration?.start || '?' }} — {{ project.duration?.end || '至今' }}
      </span>
      <span v-if="project.techStack?.length" class="project-tech">
        <span v-for="tech in project.techStack" :key="tech" class="tech-tag">{{ tech }}</span>
      </span>
    </div>
    <p v-if="project.description" class="project-description">
      {{ project.description }}
      <button class="polish-btn" title="AI润色此段描述" @click.stop="$emit('polish', { type: 'project', label: project.name, text: project.description, context: { name: project.name, role: project.role, techStack: project.techStack } })">✨ 润色</button>
    </p>
    <ul v-if="project.highlights?.length" class="project-highlights">
      <li v-for="(h, i) in project.highlights" :key="i">{{ h }}</li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  project: {
    type: Object,
    required: true
  },
  index: { type: Number, default: -1 }
})
defineEmits(['polish'])
</script>

<style scoped>
.project-item {
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--yellow);
}

.project-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.project-name {
  font-family: var(--font-heading);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.project-role {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.project-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
  flex-wrap: wrap;
}

.project-duration {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.project-tech {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tech-tag {
  font-size: 0.65rem;
  padding: 1px 7px;
  border-radius: 100px;
  background: var(--color-accent-bg);
  color: #8a7a20;
  font-weight: 500;
}

.project-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-sm);
}

.project-highlights {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-highlights li {
  position: relative;
  padding-left: 16px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.project-highlights li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--color-text-muted);
}

.polish-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  color: var(--blue, #2B7FD8);
  background: rgba(43,127,216,.06);
  border: 1px solid rgba(43,127,216,.15);
  border-radius: 10px;
  padding: 1px 8px;
  cursor: pointer;
  font-family: var(--font-body);
  vertical-align: middle;
  margin-left: 4px;
  transition: all .15s;
}
.polish-btn:hover { background: rgba(43,127,216,.14); border-color: var(--blue); }
</style>
