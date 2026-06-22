<!-- ResumeSkillList.vue — 技能清单：按分类分组 + 星级熟练度 -->
<template>
  <section v-if="Object.keys(grouped).length > 0">
    <h2 class="resume-section-title">技能清单</h2>
    <div v-for="(skills, cat) in grouped" :key="cat" class="skill-category">
      <p class="skill-category-name">{{ cat }}</p>
      <div class="skill-items">
        <span v-for="s in skills" :key="s.name" class="skill-item">
          <strong>{{ s.name }}</strong>
          <span class="skill-stars">
            <span v-for="n in 5" :key="n" class="skill-star" :class="n <= starLevel(s.proficiency) ? 'filled' : 'empty'">★</span>
          </span>
          <span v-if="s.yearsUsed" class="skill-years">{{ s.yearsUsed }}年</span>
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  skills: { type: Array, default: () => [] }
})

const grouped = computed(() => {
  if (!props.skills?.length) return {}
  return props.skills.reduce((acc, s) => {
    (acc[s.category || '其他'] ||= []).push(s)
    return acc
  }, {})
})

function starLevel(prof) {
  const map = { expert: 5, advanced: 4, intermediate: 3, beginner: 2, familiar: 2 }
  return map[prof] ?? 3
}
</script>

<style scoped>
.skill-years {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-left: 4px;
}
</style>
