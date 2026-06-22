<!-- ResumeProjectList.vue — 项目经历卡片 -->
<template>
  <section v-if="sorted.length > 0">
    <h2 class="resume-section-title">项目经历</h2>
    <div v-for="(p, i) in sorted" :key="i" class="resume-card">
      <h3 class="resume-card-title">{{ p.name }}</h3>
      <p class="resume-card-subtitle">
        <span v-if="p.role">{{ p.role }}</span>
        <span v-if="p.role && formattedTech(p.techStack)"> | </span>
        <span v-if="formattedTech(p.techStack)">{{ formattedTech(p.techStack) }}</span>
      </p>
      <p class="resume-card-meta">{{ formatDuration(p.duration) }}</p>
      <p v-if="p.description" class="resume-card-meta">{{ p.description }}</p>
      <ul v-if="p.highlights?.length" class="resume-highlights">
        <li v-for="(h, j) in p.highlights" :key="j">{{ h }}</li>
      </ul>
      <div v-if="p.techStack?.length" class="resume-tags">
        <span v-for="t in p.techStack.slice(0, 8)" :key="t" class="resume-tag">{{ t }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  sortBy: { type: String, default: 'chronological' },
  maxCount: { type: [String, Number], default: 'all' },
  jdKeywords: { type: Array, default: () => [] }
})

const sorted = computed(() => {
  const list = [...props.projects]
  if (props.sortBy === 'relevance' && props.jdKeywords.length) {
    list.sort((a, b) => calcRelevance(b) - calcRelevance(a))
  } else {
    list.sort((a, b) => (b.duration?.start || '').localeCompare(a.duration?.start || ''))
  }
  if (props.maxCount !== 'all') return list.slice(0, Number(props.maxCount))
  return list
})

function calcRelevance(p) {
  if (!props.jdKeywords.length) return 0
  let score = 0
  const haystack = [p.name, p.description, (p.techStack || []).join(' ')].join(' ').toLowerCase()
  props.jdKeywords.forEach(kw => { if (haystack.includes(kw.toLowerCase())) score += 2 })
  return score
}

function formatDuration(d) {
  if (!d?.start) return ''
  return `${d.start} — ${d.end || '至今'}`
}

function formattedTech(stack) {
  return (stack || []).slice(0, 5).join(', ')
}
</script>
