<!-- ReportList.vue — 分析报告卡片列表 -->
<template>
  <div class="report-list">
    <ReportItem
      v-for="report in sortedList"
      :key="report.id"
      :report="report"
      @delete="$emit('delete', report.id)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ReportItem from './ReportItem.vue'

const props = defineProps({
  list: {
    type: Array,
    default: () => []
  }
})

defineEmits(['delete'])

// 按时间倒序
const sortedList = computed(() =>
  [...props.list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
)
</script>

<style scoped>
.report-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
