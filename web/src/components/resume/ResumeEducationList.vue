<!-- ResumeEducationList.vue — 教育背景（仅在有学校/专业信息时展示） -->
<template>
  <section v-if="meaningful.length > 0">
    <h2 class="resume-section-title">教育背景</h2>
    <div v-for="(e, i) in meaningful" :key="i" class="resume-card">
      <h3 class="resume-card-title">{{ e.school || e.degree || '' }}</h3>
      <p class="resume-card-subtitle">
        <span v-if="e.degree">{{ e.degree }}</span>
        <span v-if="e.major"> · {{ e.major }}</span>
        <span v-if="e.graduationYear"> · {{ e.graduationYear }}年毕业</span>
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ education: { type: Array, default: () => [] } })

const meaningful = computed(() =>
  (props.education || []).filter(e => e.school || e.major)
)
</script>
