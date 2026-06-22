<!-- ResumeEducationList.vue — 教育背景 -->
<template>
  <section v-if="education.length > 0">
    <h2 class="resume-section-title">教育背景</h2>
    <div v-for="(e, i) in education" :key="i" class="resume-card">
      <h3 class="resume-card-title">{{ e.school || '' }}</h3>
      <p class="resume-card-subtitle">
        <span v-if="e.degree">{{ e.degree }}</span>
        <span v-if="e.major"> · {{ e.major }}</span>
        <span v-if="e.graduationYear"> · {{ e.graduationYear }}年</span>
      </p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  education: { type: Array, default: () => [] }
})
</script>
