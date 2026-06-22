<!-- ReportsPage.vue — 分析报告列表 -->
<template>
  <div class="reports-page">
    <h1 class="page-title">分析报告</h1>

    <!-- 加载态 -->
    <LoadingSpinner v-if="store.loading" text="加载报告中..." />

    <!-- 错误态 -->
    <ErrorState
      v-else-if="store.error"
      :message="store.error"
      @retry="store.fetchList()"
    />

    <!-- 空态 -->
    <EmptyState
      v-else-if="store.isEmpty"
      icon="chart"
      title="还没有分析报告"
      description="在 Claude Code 中粘贴 JD 开始分析，生成第一份报告"
    />

    <!-- 报告列表 -->
    <ReportList v-else :list="store.list" @delete="handleDelete" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useReportsStore } from '@/stores/reports'
import ReportList from '@/components/report/ReportList.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const store = useReportsStore()

onMounted(() => {
  store.fetchList()
})

function handleDelete(id) {
  store.remove(id)
}
</script>

<style scoped>
.reports-page {
  max-width: 900px;
}
</style>
