<!-- GapBreakdown.vue — 技能差距逐项分析 -->
<template>
  <section class="card gap-breakdown">
    <h2 class="section-title">技能差距分析</h2>

    <div class="gap-groups">
      <!-- 缺失技能 -->
      <div v-if="missing.length" class="gap-group">
        <h3 class="group-title group-missing">缺失技能 ({{ missing.length }})</h3>
        <div v-for="item in missing" :key="item.skillName" class="gap-item missing-item">
          <div class="gap-header">
            <span class="gap-name">{{ item.skillName }}</span>
            <span class="tag tag-required">{{ item.jdImportance === 'required' ? '必须' : '加分' }}</span>
          </div>
          <p class="gap-note">{{ item.note }}</p>
          <!-- 学习建议 -->
          <div v-if="item.learningAdvice" class="learning-advice">
            <div class="advice-meta">
              <span>预计 {{ item.learningAdvice.estimatedWeeks }} 周</span>
              <span>· 难度 {{ item.learningAdvice.difficulty }}</span>
            </div>
            <ul class="advice-list">
              <li v-for="(s, i) in item.learningAdvice.suggestions" :key="i">
                <strong>{{ s.title }}</strong>
                <span class="advice-desc">{{ s.description }}</span>
                <span class="advice-hours">({{ s.estimatedHours }}h)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 部分匹配 -->
      <div v-if="partial.length" class="gap-group">
        <h3 class="group-title group-partial">部分匹配 ({{ partial.length }})</h3>
        <div v-for="item in partial" :key="item.skillName" class="gap-item partial-item">
          <div class="gap-header">
            <span class="gap-name">{{ item.skillName }}</span>
            <span class="gap-levels">
              <span class="user-level">{{ item.userProficiency || '无' }}</span>
              <span class="level-arrow">→</span>
              <span class="jd-level">{{ item.jdRequirement || '要求' }}</span>
            </span>
          </div>
          <p class="gap-note">{{ item.note }}</p>
        </div>
      </div>

      <!-- 完全匹配（默认折叠） -->
      <details v-if="matched.length" class="gap-group matched-group">
        <summary class="group-title group-matched">完全匹配 ({{ matched.length }})</summary>
        <div v-for="item in matched" :key="item.skillName" class="gap-item matched-item">
          <span class="gap-name">{{ item.skillName }}</span>
          <span class="user-level">{{ item.userProficiency }}</span>
        </div>
      </details>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: {
    type: Array,
    default: () => []
  }
})

const missing = computed(() => props.analysis.filter(a => a.match === 'missing'))
const partial = computed(() => props.analysis.filter(a => a.match === 'partial'))
const matched = computed(() => props.analysis.filter(a => a.match === 'matched'))
</script>

<style scoped>
.gap-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.group-title {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  cursor: pointer;
}

.group-missing { color: var(--color-danger); }
.group-partial { color: var(--color-warning); }
.group-matched { color: var(--color-success); }

.gap-item {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-sm);
}

.missing-item { background: var(--color-danger-bg); }
.partial-item { background: var(--color-warning-bg); }
.matched-item {
  background: var(--color-success-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
}

.gap-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.gap-name {
  font-weight: 600;
  color: var(--color-text);
}

.gap-levels {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.level-arrow {
  color: var(--color-text-muted);
}

.user-level {
  font-weight: 500;
}

.gap-note {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.learning-advice {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.advice-meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
}

.advice-list {
  list-style: none;
}

.advice-list li {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-xs);
}

.advice-desc {
  display: block;
  margin-left: 0;
  color: var(--color-text-muted);
}

.advice-hours {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
