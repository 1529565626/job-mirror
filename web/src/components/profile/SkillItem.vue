<!-- SkillItem.vue — 技能卡片（编辑模式支持） -->
<template>
  <div class="skill-card" :class="`skill-card--${editMode ? 'editing' : skill.proficiency}`">
    <!-- 编辑模式 -->
    <template v-if="editMode">
      <div class="skill-card__header">
        <input v-model="local.name" class="skill-input name-input" placeholder="技能名称" />
        <button class="btn-del-skill" @click="$emit('delete')" title="删除技能">×</button>
      </div>
      <div class="skill-card__stars">
        <button v-for="i in 5" :key="i" class="star-btn" :class="{ 'star--filled': i <= localLevel }" @click="localLevel = i">&#9733;</button>
      </div>
      <div class="skill-card__meta">
        <select v-model="local.category" class="skill-select">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <input v-model.number="local.yearsUsed" class="skill-input years-input" type="number" min="0" max="50" placeholder="年限" />
      </div>
    </template>
    <!-- 展示模式 -->
    <template v-else>
      <div class="skill-card__header">
        <span class="skill-card__name">{{ skill.name }}</span>
        <span v-if="skill.yearsUsed" class="skill-card__years">{{ skill.yearsUsed }}y</span>
      </div>
      <div class="skill-card__stars">
        <span v-for="i in 5" :key="i" class="star" :class="{ 'star--filled': i <= proficiencyLevel }">&#9733;</span>
      </div>
      <span class="skill-card__tag">{{ skill.category }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  skill: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'delete'])

const categories = ['编程语言', '框架/工具', '数据分析', '产品/设计', '运营/市场', '管理/软技能', '语言', '其他']

const levelMap = { novice: 1, intermediate: 2, advanced: 3, proficient: 4, expert: 5 }
const revLevelMap = { 1: 'novice', 2: 'intermediate', 3: 'advanced', 4: 'proficient', 5: 'expert' }

const proficiencyLevel = computed(() => levelMap[props.skill.proficiency] || 1)

const local = reactive({ name: '', category: '编程语言', yearsUsed: 0 })
const localLevel = computed({
  get: () => levelMap[local.category ? local._proficiency || 'intermediate' : 'intermediate'] || 2,
  set: (v) => { local._proficiency = revLevelMap[v] }
})

watch(() => props.skill, (v) => {
  if (v) Object.assign(local, { ...v, _proficiency: v.proficiency || 'intermediate' })
}, { immediate: true })

watch([() => local.name, () => local.category, () => local.yearsUsed, localLevel], () => {
  emit('update', { ...local, proficiency: local._proficiency || revLevelMap[localLevel.value] || 'intermediate' })
}, { deep: true })
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
.skill-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--accent-bar);
}
.skill-card--expert     { --accent-bar: #2d6a4f; }
.skill-card--proficient { --accent-bar: var(--blue); }
.skill-card--advanced   { --accent-bar: #6366f1; }
.skill-card--intermediate { --accent-bar: var(--yellow); }
.skill-card--novice     { --accent-bar: var(--color-text-muted); }
.skill-card--editing    { --accent-bar: var(--blue); border-color: var(--blue); }
.skill-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--accent-bar); }
.skill-card__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.skill-card__name { font-size: 0.9rem; font-weight: 600; color: var(--color-text); line-height: 1.3; }
.skill-card__years { font-size: 0.7rem; font-weight: 500; color: var(--color-text-muted); background: var(--color-bg); padding: 2px 6px; border-radius: 4px; }
.skill-card__stars { display: flex; gap: 2px; }
.star { font-size: 0.85rem; color: #e2e8f0; }
.star--filled { color: var(--yellow); }
.star-btn { font-size: 1.1rem; background: none; border: none; cursor: pointer; color: #e2e8f0; padding: 0 2px; transition: color 0.15s; }
.star-btn:hover, .star-btn.star--filled { color: var(--yellow); }
.skill-card__tag { font-size: 0.65rem; color: var(--color-text-muted); background: var(--color-bg); padding: 2px 8px; border-radius: 100px; align-self: flex-start; }
.skill-card__meta { display: flex; gap: var(--space-xs); align-items: center; }
.skill-input { font-size: 0.8rem; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 3px 6px; font-family: var(--font-body); }
.name-input { flex: 1; font-weight: 600; }
.years-input { width: 50px; text-align: center; }
.skill-select { font-size: 0.7rem; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 3px 4px; font-family: var(--font-body); }
.btn-del-skill { font-size: 1rem; color: var(--red); background: none; border: none; cursor: pointer; padding: 0 4px; line-height: 1; }
.btn-del-skill:hover { opacity: 0.7; }
</style>
