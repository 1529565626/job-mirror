<!-- ExperienceItem.vue — 单段工作经历 (design-keai) -->
<template>
  <div class="experience-item">
    <div class="exp-header">
      <h3 class="exp-role">{{ experience.role }}</h3>
      <span class="exp-company">{{ experience.company }}</span>
    </div>
    <div class="exp-duration">
      {{ experience.duration?.start || '?' }} — {{ experience.duration?.end || '至今' }}
    </div>
    <p v-if="experience.description" class="exp-description">
      {{ experience.description }}
      <button class="polish-btn" title="AI润色此段描述" @click.stop="$emit('polish', { type: 'experience', label: experience.role + ' · ' + experience.company, text: experience.description, context: { role: experience.role, company: experience.company } })">✨ 润色</button>
    </p>
    <ul v-if="experience.highlights?.length" class="exp-highlights">
      <li v-for="(h, i) in experience.highlights" :key="i">{{ h }}</li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  experience: {
    type: Object,
    required: true
  },
  index: { type: Number, default: -1 }
})
defineEmits(['polish'])
</script>

<style scoped>
.experience-item {
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--blue);
}

.exp-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: 2px;
}

.exp-role {
  font-family: var(--font-heading);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.exp-company {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.exp-duration {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
}

.exp-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-sm);
}

.exp-highlights {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exp-highlights li {
  position: relative;
  padding-left: 16px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.exp-highlights li::before {
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
