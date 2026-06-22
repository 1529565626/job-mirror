<!-- ResumeConfig.vue — 简历生成配置：向上展开 -->
<template>
  <div class="config-wrapper">
    <div v-if="open" class="config-popup">
      <div class="config-row">
        <label class="config-label">项目经历展示</label>
        <select class="config-select" :value="config.projectCount" @change="emit('update:config', { ...config, projectCount: $event.target.value })">
          <option value="all">全量 ({{ projects.length }} 个)</option>
          <option value="7">最多 7 个</option>
          <option value="5">最多 5 个</option>
        </select>
      </div>
      <div class="config-row">
        <label class="config-label">项目排序</label>
        <select class="config-select" :value="config.projectSort" @change="emit('update:config', { ...config, projectSort: $event.target.value })">
          <option value="relevance">按岗位相关度</option>
          <option value="chronological">按时间倒序</option>
        </select>
      </div>
      <div v-if="sortedProjects.length > 0" class="sort-preview">
        <p class="sort-preview-title">排序预览（前 {{ previewCount }} 项）</p>
        <ol class="sort-list">
          <li v-for="(p, i) in sortedProjects.slice(0, previewCount)" :key="p.name" class="sort-item">
            <span class="sort-name">{{ p.name }}</span>
            <span v-if="config.projectSort === 'relevance'" class="sort-score">{{ calcRelevance(p) }} 分</span>
          </li>
        </ol>
      </div>
    </div>
    <button class="config-toggle" @click="open = !open">
      简历配置
      <span class="toggle-arrow" :class="{ open }">{{ open ? '▾' : '▴' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  jdKeywords: { type: Array, default: () => [] },
  config: { type: Object, default: () => ({ projectCount: 'all', projectSort: 'relevance' }) }
})

const emit = defineEmits(['update:config'])
const open = ref(false)

function calcRelevance(project) {
  if (!props.jdKeywords.length) return 0
  let score = 0
  const name = (project.name || '').toLowerCase()
  const desc = (project.description || '').toLowerCase()
  const tech = (project.techStack || []).join(' ').toLowerCase()
  props.jdKeywords.forEach(kw => {
    const k = kw.toLowerCase()
    if (name.includes(k)) score += 3
    if (tech.includes(k)) score += 2
    if (desc.includes(k)) score += 1
  })
  return score
}

const sortedProjects = computed(() => {
  const list = [...props.projects]
  if (props.config.projectSort === 'relevance') {
    list.sort((a, b) => calcRelevance(b) - calcRelevance(a))
  } else {
    list.sort((a, b) => (b.duration?.start || '').localeCompare(a.duration?.start || ''))
  }
  return list
})

const previewCount = computed(() => {
  if (props.config.projectCount === 'all') return Math.min(5, props.projects.length)
  return Math.min(Number(props.config.projectCount), props.projects.length)
})
</script>

<style scoped>
.config-wrapper {
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  position: relative;
}

.config-toggle {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-toggle:hover {
  color: var(--blue);
}

.toggle-arrow {
  font-size: 0.6rem;
  transition: transform 0.15s;
}

/* 向上弹出面板 */
.config-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 -4px 16px rgba(0,0,0,.08);
  padding: var(--space-md);
  z-index: 10;
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.config-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.config-select {
  padding: 3px 8px;
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  cursor: pointer;
}

.sort-preview {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px dashed var(--color-border);
}

.sort-preview-title {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
}

.sort-list {
  list-style: decimal;
  padding-left: 1.2em;
}

.sort-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.sort-score {
  color: var(--color-text-muted);
  font-size: 0.65rem;
}
</style>
