<!-- ResumeBasicInfo.vue — 基本信息网格 -->
<template>
  <section>
    <h2 class="resume-section-title">基本信息</h2>
    <div class="resume-info-grid">
      <div v-if="basic.name" class="resume-info-item">
        <span class="resume-info-label">姓名</span>
        <span class="resume-info-value">{{ basic.name }}</span>
      </div>
      <div v-if="basic.currentRole" class="resume-info-item">
        <span class="resume-info-label">当前职位</span>
        <span class="resume-info-value">{{ basic.currentRole }}</span>
      </div>
      <div v-if="basic.industry" class="resume-info-item">
        <span class="resume-info-label">行业</span>
        <span class="resume-info-value">{{ basic.industry }}</span>
      </div>
      <div v-if="basic.yearsOfExperience" class="resume-info-item">
        <span class="resume-info-label">工作年限</span>
        <span class="resume-info-value">{{ basic.yearsOfExperience }} 年</span>
      </div>
      <div v-if="basic.targetRoles?.length" class="resume-info-item">
        <span class="resume-info-label">目标职位</span>
        <span class="resume-info-value">{{ basic.targetRoles.join(' / ') }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  basic: { type: Object, default: () => ({}) }
})
</script>
