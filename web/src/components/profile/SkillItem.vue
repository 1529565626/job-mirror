<!-- SkillItem.vue — 技能卡片 (design-keai 星标版) -->
<template>
  <div class="skill-card" :class="`skill-card--${skill.proficiency}`">
    <div class="skill-card__header">
      <span class="skill-card__name">{{ skill.name }}</span>
      <span v-if="skill.yearsUsed" class="skill-card__years">{{ skill.yearsUsed }}y</span>
    </div>

    <!-- 星级评分 -->
    <div class="skill-card__stars">
      <span
        v-for="i in 5"
        :key="i"
        class="star"
        :class="{ 'star--filled': i <= proficiencyLevel }"
      >&#9733;</span>
    </div>

    <span class="skill-card__tag">{{ skill.category }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  skill: { type: Object, required: true }
})

const levelMap = { novice: 1, intermediate: 2, advanced: 3, proficient: 4, expert: 5 }
const proficiencyLevel = computed(() => levelMap[props.skill.proficiency] || 1)
</script>

<style scoped>
.skill-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* 左侧色条 */
.skill-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-bar);
}

.skill-card--expert     { --accent-bar: #2d6a4f; }
.skill-card--proficient { --accent-bar: var(--blue); }
.skill-card--advanced   { --accent-bar: #6366f1; }
.skill-card--intermediate { --accent-bar: var(--yellow); }
.skill-card--novice     { --accent-bar: var(--color-text-muted); }

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-bar);
}

.skill-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.skill-card__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-card__years {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* === 星标 === */
.skill-card__stars {
  display: flex;
  gap: 2px;
}

.star {
  font-size: 0.85rem;
  color: #e2e8f0;
  line-height: 1;
  transition: color 0.2s;
}

.star--filled {
  color: var(--yellow);
}

.skill-card__tag {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 2px 8px;
  border-radius: 100px;
  align-self: flex-start;
  letter-spacing: 0.02em;
}
</style>
