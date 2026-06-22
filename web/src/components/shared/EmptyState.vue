<!-- EmptyState.vue — 空数据提示 -->
<template>
  <div class="empty-state">
    <div class="empty-icon">{{ iconMap[icon] || '📄' }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <button v-if="actionText" class="btn btn-primary" @click="$emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'file'
  },
  title: {
    type: String,
    default: '暂无数据'
  },
  description: {
    type: String,
    default: ''
  },
  actionText: {
    type: String,
    default: ''
  }
})

defineEmits(['action'])

const iconMap = {
  user: '📋',
  briefcase: '💼',
  chart: '📊',
  file: '📄'
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  opacity: 0.6;
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-sm);
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  max-width: 360px;
  line-height: 1.5;
  margin-bottom: var(--space-lg);
}
</style>
