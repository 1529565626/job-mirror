<!-- MatchScore.vue — SVG 环形匹配度图 -->
<template>
  <div class="match-score">
    <svg :width="size" :height="size" viewBox="0 0 160 160">
      <!-- 背景圆环 -->
      <circle
        cx="80" cy="80" r="64"
        fill="none"
        :stroke="bgColor"
        stroke-width="12"
      />
      <!-- 进度圆环 -->
      <circle
        cx="80" cy="80" r="64"
        fill="none"
        :stroke="color"
        stroke-width="12"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        transform="rotate(-90 80 80)"
        class="progress-ring"
      />
      <!-- 中心文字 -->
      <text x="80" y="74" text-anchor="middle" class="score-text" :fill="color">
        {{ score }}%
      </text>
      <text x="80" y="100" text-anchor="middle" class="score-label-text">
        综合匹配度
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: {
    type: Number,
    required: true
  },
  size: {
    type: Number,
    default: 160
  }
})

const circumference = 2 * Math.PI * 64

const dashArray = computed(() => {
  const filled = (props.score / 100) * circumference
  return `${filled} ${circumference - filled}`
})

const color = computed(() => {
  if (props.score >= 80) return '#16a34a'
  if (props.score >= 50) return '#2563eb'
  if (props.score >= 30) return '#f59e0b'
  return '#dc2626'
})

const bgColor = '#e2e8f0'
</script>

<style scoped>
.match-score {
  display: flex;
  justify-content: center;
}

.progress-ring {
  transition: stroke-dasharray 0.6s ease;
}

.score-text {
  font-size: 28px;
  font-weight: 700;
}

.score-label-text {
  font-size: 12px;
  fill: #94a3b8;
}
</style>
