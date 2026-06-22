<!-- BasicInfo.vue — 基本信息卡片 -->
<template>
  <section class="card basic-info">
    <h2 class="section-title">基本信息</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">姓名</span>
        <span class="info-value">{{ basic.name || '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">行业</span>
        <span class="info-value">{{ basic.industry || '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">工作年限</span>
        <span class="info-value">{{ basic.yearsOfExperience ? basic.yearsOfExperience + ' 年' : '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">当前职位</span>
        <span class="info-value">{{ basic.currentRole || '未填写' }}</span>
      </div>
    </div>
    <div v-if="basic.targetRoles?.length" class="target-roles">
      <span class="info-label">目标职位</span>
      <span v-for="role in basic.targetRoles" :key="role" class="tag">{{ role }}</span>
    </div>
    <p v-if="basic.summary" class="summary">{{ basic.summary }}</p>
  </section>
</template>

<script setup>
defineProps({
  basic: {
    type: Object,
    default: () => ({})
  }
})
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--text-base);
  color: var(--color-text);
}

.target-roles {
  margin-top: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.summary {
  margin-top: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
