<!-- SkillGapChart.vue — SVG 技能雷达图 -->
<template>
  <div class="skill-gap-chart card">
    <h2 class="section-title">技能雷达图</h2>
    <div class="chart-container">
      <svg :width="chartSize" :height="chartSize" viewBox="0 0 300 300">
        <!-- 背景网格（多边形） -->
        <polygon
          v-for="level in 5"
          :key="level"
          :points="gridPoints(level)"
          fill="none"
          stroke="#e2e8f0"
          stroke-width="1"
        />
        <!-- 轴线 -->
        <line
          v-for="(_, i) in chartData"
          :key="'axis-' + i"
          :x1="cx"
          :y1="cy"
          :x2="getPoint(i, maxR).x"
          :y2="getPoint(i, maxR).y"
          stroke="#e2e8f0"
          stroke-width="1"
        />
        <!-- JD 要求多边形 -->
        <polygon
          :points="jdPolygonPoints"
          fill="rgba(107, 114, 128, 0.15)"
          stroke="#94a3b8"
          stroke-width="1.5"
          stroke-dasharray="4 3"
        />
        <!-- 用户技能多边形 -->
        <polygon
          :points="userPolygonPoints"
          fill="rgba(37, 99, 235, 0.15)"
          stroke="#2563eb"
          stroke-width="2"
        />
        <!-- 标签 -->
        <text
          v-for="(item, i) in chartData"
          :key="'label-' + i"
          :x="getPoint(i, maxR + 30).x"
          :y="getPoint(i, maxR + 30).y"
          text-anchor="middle"
          dominant-baseline="middle"
          class="axis-label"
        >
          {{ item.skillName }}
        </text>
      </svg>
    </div>
    <!-- 图例 -->
    <div class="legend">
      <span class="legend-item">
        <span class="legend-dot user-dot"></span> 你的水平
      </span>
      <span class="legend-item">
        <span class="legend-dot jd-dot"></span> 岗位要求
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  skills: {
    type: Array,
    default: () => []
  }
})

const chartSize = 300
const cx = 150
const cy = 150
const maxR = 100

// 最多展示 8 个技能
const chartData = computed(() => props.skills.slice(0, 8))

// 匹配状态映射到 0-5 分值
function matchToScore(skill) {
  if (!skill.userProficiency) return 0
  const map = { matched: 5, partial: 3, missing: 0 }
  return map[skill.match] || 0
}

// JD 要求值（逆向映射）
function jdScore(skill) {
  const map = { required: 5, preferred: 3 }
  return map[skill.jdImportance] || 3
}

function getPoint(index, radius) {
  const n = chartData.value.length || 1
  const angle = (2 * Math.PI * index) / n - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  }
}

function gridPoints(level) {
  const r = (maxR / 5) * level
  return chartData.value.map((_, i) => {
    const p = getPoint(i, r)
    return `${p.x},${p.y}`
  }).join(' ')
}

const userPolygonPoints = computed(() =>
  chartData.value.map((s, i) => {
    const score = matchToScore(s)
    const p = getPoint(i, (maxR / 5) * score)
    return `${p.x},${p.y}`
  }).join(' ')
)

const jdPolygonPoints = computed(() =>
  chartData.value.map((s, i) => {
    const score = jdScore(s)
    const p = getPoint(i, (maxR / 5) * score)
    return `${p.x},${p.y}`
  }).join(' ')
)
</script>

<style scoped>
.chart-container {
  display: flex;
  justify-content: center;
}

.axis-label {
  font-size: 11px;
  fill: #64748b;
}

.legend {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  margin-top: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.user-dot {
  background: rgba(37, 99, 235, 0.4);
  border: 2px solid #2563eb;
}

.jd-dot {
  background: rgba(107, 114, 128, 0.15);
  border: 1.5px dashed #94a3b8;
}
</style>
