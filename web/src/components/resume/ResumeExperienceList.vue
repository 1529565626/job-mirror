<!-- ResumeExperienceList.vue — 工作经历时间线 -->
<template>
  <section v-if="experiences.length > 0">
    <h2 class="resume-section-title">工作经历</h2>
    <div v-for="(e, i) in experiences" :key="i" class="resume-card">
      <h3 class="resume-card-title">{{ e.role }}<span v-if="e.company"> · {{ e.company }}</span></h3>
      <p class="resume-card-subtitle">{{ formatDuration(e.duration) }}</p>
      <p v-if="e.description" class="resume-card-meta">{{ e.description }}</p>
      <ul v-if="e.highlights?.length" class="resume-highlights">
        <li v-for="(h, j) in e.highlights" :key="j">{{ h }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
defineProps({
  experiences: { type: Array, default: () => [] }
})

function formatDuration(d) {
  if (!d) return ''
  const start = d.start || '?'
  const end = d.end || '至今'
  return `${start} — ${end}`
}
</script>
