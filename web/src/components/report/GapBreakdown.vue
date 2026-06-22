<!-- GapBreakdown.vue — 技能差距逐项分析（按类别分组） -->
<template>
  <section class="card gap-breakdown">
    <h2 class="section-title">技能匹配详情</h2>

    <div v-if="categories.length === 0" class="gap-empty">
      暂无技能分析数据
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category-group">
      <div class="category-header">
        <span class="category-icon">{{ categoryIcon(cat.key) }}</span>
        <span class="category-name">{{ categoryLabel(cat.key) }}</span>
        <span class="category-summary">
          匹配 {{ cat.matched }} / {{ cat.total }}
        </span>
      </div>

      <div class="category-table">
        <div
          v-for="item in cat.items"
          :key="item.skillName"
          class="skill-row"
          :class="'row-' + item.match"
        >
          <span class="skill-name">{{ item.skillName }}</span>
          <span class="skill-levels">
            <span class="user-level">{{ item.userProficiency || '无' }}</span>
            <span v-if="item.match !== 'matched'" class="level-arrow">→</span>
            <span v-if="item.match !== 'matched'" class="jd-level">{{ item.jdRequirement }}</span>
          </span>
          <span class="skill-match-badge" :class="'badge-' + item.match">
            {{ matchLabel(item.match) }}
          </span>
          <span v-if="item.note" class="skill-note">{{ item.note }}</span>
        </div>
      </div>

      <!-- 该类别下的学习建议 -->
      <div v-for="item in cat.items" :key="'advice-' + item.skillName">
        <div v-if="item.learningAdvice" class="learning-advice">
          <div class="advice-meta">
            预计 {{ item.learningAdvice.estimatedWeeks }} 周 · 难度 {{ item.learningAdvice.difficulty }}
          </div>
          <ul class="advice-list">
            <li v-for="(s, i) in item.learningAdvice.suggestions" :key="i">
              <strong>[{{ s.type }}] {{ s.title }}</strong>
              <span class="advice-desc">{{ s.description }}</span>
              <span class="advice-hours">({{ s.estimatedHours }}h)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: { type: Array, default: () => [] }
})

const matchOrder = { missing: 0, partial: 1, matched: 2 }

const categories = computed(() => {
  const groups = { hard: [], soft: [], industry: [] }

  for (const item of props.analysis) {
    const cat = item.category || 'hard'
    if (groups[cat]) groups[cat].push(item)
    else groups.hard.push(item)
  }

  // Sort items within each category: missing first, then partial, then matched
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (matchOrder[a.match] ?? 2) - (matchOrder[b.match] ?? 2))
  }

  const result = []
  const order = ['hard', 'industry', 'soft']
  for (const key of order) {
    if (groups[key].length > 0) {
      result.push({
        key,
        items: groups[key],
        total: groups[key].length,
        matched: groups[key].filter(i => i.match === 'matched').length
      })
    }
  }
  return result
})

function categoryIcon(key) {
  return { hard: '🛠', soft: '🤝', industry: '📈' }[key] || '📋'
}

function categoryLabel(key) {
  return { hard: '硬技能 (Hard Skills)', soft: '软技能 (Soft Skills)', industry: '行业术语 (Industry Terms)' }[key] || key
}

function matchLabel(m) {
  return { matched: '匹配', partial: '部分', missing: '缺失' }[m] || m
}
</script>

<style scoped>
.gap-empty {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-lg);
}

.category-group {
  margin-bottom: var(--space-lg);
}

.category-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--color-border);
}

.category-icon { font-size: var(--text-base); }
.category-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text);
  flex: 1;
}

.category-summary {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.category-table {
  display: flex;
  flex-direction: column;
}

.skill-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.skill-row + .skill-row { border-top: 1px solid var(--color-border); }

.row-missing { background: var(--color-danger-bg); }
.row-partial { background: var(--color-warning-bg); }
.row-matched { background: transparent; }

.skill-name { font-weight: 600; color: var(--color-text); }

.skill-levels {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.level-arrow { color: var(--color-text-muted); }
.user-level { font-weight: 500; }

.skill-match-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 12px;
}

.badge-matched { background: var(--color-success-bg); color: var(--color-success); }
.badge-partial { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-missing { background: var(--color-danger-bg); color: var(--color-danger); }

.skill-note {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  grid-column: 1 / -1;
}

.learning-advice {
  margin-top: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-left: 2px solid var(--blue);
  background: var(--color-primary-bg);
  border-radius: var(--radius-sm);
}

.advice-meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
}

.advice-list { list-style: none; }
.advice-list li {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-xs);
}

.advice-desc { display: block; color: var(--color-text-muted); margin-left: 0; }
.advice-hours { font-size: 0.7rem; color: var(--color-text-muted); margin-left: var(--space-xs); }
</style>
