<!-- ErrorState.vue — 错误态 + 重试 -->
<template>
  <div class="error-state">
    <div class="error-icon">⚠️</div>
    <h3 class="error-title">加载失败</h3>
    <p class="error-message">{{ message }}</p>
    <button class="btn btn-primary" @click="$emit('retry')">
      重试
    </button>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: '发生未知错误'
  }
})

defineEmits(['retry'])
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  text-align: center;
}

.error-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-md);
}

.error-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-danger);
  margin-bottom: var(--space-sm);
}

.error-message {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  max-width: 400px;
  line-height: 1.5;
  margin-bottom: var(--space-lg);
}
</style>
