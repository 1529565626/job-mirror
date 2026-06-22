<!-- ResumeSkillList.vue — 技能清单：按分类分组 + 文字标签 -->
<template>
  <section v-if="Object.keys(grouped).length > 0">
    <h2 class="resume-section-title">技能清单</h2>
    <div v-for="(skills, cat) in grouped" :key="cat" class="skill-category">
      <p class="skill-category-name">{{ cat }}</p>
      <div class="skill-items">
        <span v-for="s in skills" :key="s.name" class="skill-item">
          <span class="skill-name">{{ s.name }}</span>
          <span class="skill-tag" :class="'proficiency-' + s.proficiency">{{ proficiencyLabel(s.proficiency) }}</span>
          <span v-if="s.yearsUsed" class="skill-years">{{ s.yearsUsed }}y</span>
          <span v-if="s.note" class="skill-note">{{ s.note.slice(0, 80) }}{{ s.note.length > 80 ? '…' : '' }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ skills: { type: Array, default: () => [] } })

const grouped = computed(() => {
  if (!props.skills?.length) return {}
  return props.skills.reduce((acc, s) => {
    (acc[s.category || '其他'] ||= []).push(s)
    return acc
  }, {})
})

function proficiencyLabel(prof) {
  const map = { expert: '精通', proficient: '精通', advanced: '熟练', intermediate: '掌握', novice: '了解' }
  return map[prof] || '掌握'
}
</script>

<style scoped>
.skill-category { margin-bottom: 0.5rem; }
.skill-category-name { font-size: var(--text-sm); font-weight: 700; color: var(--color-text); margin-bottom: 0.25rem; }
.skill-items { display: flex; flex-wrap: wrap; gap: 8px 12px; }
.skill-item { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); }
.skill-name { color: var(--ink); font-weight: 500; }
.skill-tag {
  font-size: 0.6rem; font-weight: 600; padding: 1px 6px; border-radius: 8px;
  background: var(--color-bg); color: var(--color-text-muted);
}
.proficiency-expert, .proficiency-proficient { background: #27ae6020; color: #1f8b4c; }
.proficiency-advanced { background: #2b7fd820; color: #1a6bc4; }
.proficiency-intermediate { background: #f4d75830; color: #8b7a10; }
.proficiency-novice { background: var(--color-bg); color: var(--color-text-muted); }
.skill-years { font-size: 0.65rem; color: var(--color-text-muted); }
</style>
