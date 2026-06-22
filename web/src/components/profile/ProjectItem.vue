<!-- ProjectItem.vue — 项目经历（支持编辑） -->
<template>
  <div class="project-item">
    <template v-if="editMode">
      <div class="project-header">
        <input v-model="local.name" class="proj-input name-input" placeholder="项目名称" />
        <input v-model="local.role" class="proj-input role-input" placeholder="角色" />
        <button class="btn-del-proj" @click="$emit('delete')">×</button>
      </div>
      <div class="proj-duration-row">
        <input v-model="local._start" class="proj-input date-input" placeholder="开始" />
        <span>—</span>
        <input v-model="local._end" class="proj-input date-input" placeholder="至今(留空)" />
      </div>
      <div class="techstack-edit">
        <input v-model="techStackText" class="proj-input" placeholder="技术栈，逗号分隔" style="flex:1" />
      </div>
      <textarea v-model="local.description" class="proj-textarea" rows="2" placeholder="项目描述"></textarea>
      <div class="highlights-edit">
        <div v-for="(h, i) in local.highlights" :key="i" class="hl-row">
          <input v-model="local.highlights[i]" class="proj-input hl-input" placeholder="成果" />
          <button class="btn-del-hl" @click="local.highlights.splice(i, 1)">×</button>
        </div>
        <button class="btn-add-hl" @click="local.highlights.push('')">+ 添加成果</button>
      </div>
    </template>
    <template v-else>
      <div class="project-header">
        <h3 class="project-name">{{ project.name }}</h3>
        <span v-if="project.role" class="project-role">{{ project.role }}</span>
      </div>
      <div class="project-meta">
        <span v-if="project.duration" class="project-duration">{{ project.duration?.start || '?' }} — {{ project.duration?.end || '至今' }}</span>
        <span v-if="project.techStack?.length" class="project-tech">
          <span v-for="tech in project.techStack" :key="tech" class="tech-tag">{{ tech }}</span>
        </span>
      </div>
      <p v-if="project.description" class="project-description">
        {{ project.description }}
        <button class="polish-btn" @click.stop="$emit('polish', { type: 'project', label: project.name, text: project.description, context: { name: project.name, role: project.role, techStack: project.techStack } })">✨ 润色</button>
      </p>
      <ul v-if="project.highlights?.length" class="project-highlights">
        <li v-for="(h, i) in project.highlights" :key="i">{{ h }}</li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  project: { type: Object, required: true },
  index: { type: Number, default: -1 },
  editMode: { type: Boolean, default: false }
})
const emit = defineEmits(['update', 'delete', 'polish'])

const local = reactive({ name: '', role: '', _start: '', _end: '', description: '', highlights: [], techStack: [] })

const techStackText = computed({
  get: () => (local.techStack || []).join('，'),
  set: (v) => { local.techStack = v.split(/[,，]/).map(s => s.trim()).filter(Boolean) }
})

watch(() => props.project, (v) => {
  if (v) Object.assign(local, {
    name: v.name || '', role: v.role || '',
    _start: v.duration?.start || '', _end: v.duration?.end || '',
    description: v.description || '', highlights: [...(v.highlights || [])], techStack: [...(v.techStack || [])]
  })
}, { immediate: true })

watch(local, () => {
  emit('update', {
    name: local.name, role: local.role,
    duration: { start: local._start, end: local._end },
    description: local.description, highlights: local.highlights.filter(h => h.trim()), techStack: local.techStack
  })
}, { deep: true })
</script>

<style scoped>
.project-item { padding: var(--space-md); background: var(--color-bg); border-radius: var(--radius-sm); border-left: 3px solid var(--yellow); margin-bottom: var(--space-sm); }
.project-header { display: flex; align-items: baseline; gap: var(--space-sm); margin-bottom: 2px; flex-wrap: wrap; }
.project-name { font-family: var(--font-heading); font-size: var(--text-base); font-weight: 600; color: var(--color-text); }
.project-role { font-size: var(--text-sm); color: var(--color-text-secondary); }
.project-meta { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-sm); flex-wrap: wrap; }
.project-duration { font-size: var(--text-xs); color: var(--color-text-muted); }
.project-tech { display: flex; gap: 4px; flex-wrap: wrap; }
.tech-tag { font-size: 0.65rem; padding: 1px 7px; border-radius: 100px; background: var(--color-accent-bg); color: #8a7a20; font-weight: 500; }
.project-description { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.7; margin-bottom: var(--space-sm); }
.project-highlights { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.project-highlights li { position: relative; padding-left: 16px; font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; }
.project-highlights li::before { content: '—'; position: absolute; left: 0; color: var(--color-text-muted); }
.polish-btn { display: inline-flex; align-items: center; gap: 2px; font-size: 0.65rem; color: var(--blue); background: rgba(43,127,216,.06); border: 1px solid rgba(43,127,216,.15); border-radius: 10px; padding: 1px 8px; cursor: pointer; font-family: var(--font-body); vertical-align: middle; margin-left: 4px; transition: all .15s; }
.polish-btn:hover { background: rgba(43,127,216,.14); border-color: var(--blue); }

.proj-input { font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-body); }
.name-input { flex: 1; font-weight: 600; }
.role-input { width: 120px; }
.date-input { width: 90px; }
.proj-duration-row { display: flex; align-items: center; gap: var(--space-xs); margin-bottom: var(--space-sm); font-size: var(--text-xs); color: var(--color-text-muted); }
.techstack-edit { display: flex; margin-bottom: var(--space-sm); }
.proj-textarea { width: 100%; font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 6px 8px; font-family: var(--font-body); resize: vertical; margin-bottom: var(--space-sm); line-height: 1.5; }
.highlights-edit { display: flex; flex-direction: column; gap: var(--space-xs); }
.hl-row { display: flex; gap: var(--space-xs); align-items: center; }
.hl-input { flex: 1; }
.btn-del-proj, .btn-del-hl { font-size: 1rem; color: var(--red); background: none; border: none; cursor: pointer; padding: 0 4px; }
.btn-add-hl { font-size: 0.7rem; color: var(--blue); background: none; border: 1px dashed var(--blue); border-radius: var(--radius-sm); padding: 3px 8px; cursor: pointer; font-family: var(--font-body); align-self: flex-start; }
</style>
