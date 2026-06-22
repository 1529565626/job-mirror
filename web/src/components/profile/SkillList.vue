<!-- SkillList.vue — 技能卡片网格（Bento 风格） -->
<template>
  <section class="card skill-section">
    <div class="skill-section__header">
      <h2 class="section-title">技能清单</h2>
      <span class="skill-section__count">{{ skills.length }} 项</span>
    </div>

    <!-- 分类筛选 -->
    <div class="filter-bar" v-if="categories.length > 1">
      <button
        v-for="cat in categories"
        :key="cat"
        class="filter-chip"
        :class="{ 'filter-chip--active': activeCategory === cat }"
        @click="activeCategory = cat"
      >{{ cat }}</button>
    </div>

    <!-- 卡片网格 -->
    <div v-if="filteredSkills.length" class="skill-grid">
      <SkillItem v-for="skill in filteredSkills" :key="skill.name" :skill="skill" />
    </div>
    <div v-else class="skill-section__empty">暂无技能记录</div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import SkillItem from './SkillItem.vue'

const props = defineProps({
  skills: { type: Array, default: () => [] }
})

const activeCategory = ref('全部')

const categories = computed(() => {
  const cats = [...new Set(props.skills.map(s => s.category))]
  return ['全部', ...cats.sort()]
})

const filteredSkills = computed(() => {
  if (activeCategory.value === '全部') return props.skills
  return props.skills.filter(s => s.category === activeCategory.value)
})
</script>

<style scoped>
.skill-section__header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.skill-section__count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 400;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.filter-chip {
  padding: 4px 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-chip--active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 500;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.skill-section__empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 24px;
}
</style>
