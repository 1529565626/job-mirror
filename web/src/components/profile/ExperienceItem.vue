<!-- ExperienceItem.vue — 工作经历（支持编辑） -->
<template>
  <div class="experience-item">
    <template v-if="editMode">
      <div class="exp-header">
        <input v-model="local.role" class="exp-input role-input" placeholder="职位" />
        <input v-model="local.company" class="exp-input company-input" placeholder="公司" />
        <button class="btn-del-exp" @click="$emit('delete')" title="删除">×</button>
      </div>
      <div class="exp-duration-row">
        <input v-model="local._start" class="exp-input date-input" placeholder="开始 YYYY-MM" />
        <span>—</span>
        <input v-model="local._end" class="exp-input date-input" placeholder="至今(留空)" />
      </div>
      <textarea v-model="local.description" class="exp-textarea" rows="2" placeholder="核心职责描述"></textarea>
      <div class="highlights-edit">
        <div v-for="(h, i) in local.highlights" :key="i" class="hl-row">
          <input v-model="local.highlights[i]" class="exp-input hl-input" placeholder="成果描述" />
          <button class="btn-del-hl" @click="local.highlights.splice(i, 1)">×</button>
        </div>
        <button class="btn-add-hl" @click="local.highlights.push('')">+ 添加成果</button>
      </div>
    </template>
    <template v-else>
      <div class="exp-header">
        <h3 class="exp-role">{{ experience.role }}</h3>
        <span class="exp-company">{{ experience.company }}</span>
      </div>
      <div class="exp-duration">{{ experience.duration?.start || '?' }} — {{ experience.duration?.end || '至今' }}</div>
      <p v-if="experience.description" class="exp-description">
        {{ experience.description }}
        <button class="polish-btn" title="AI润色" @click.stop="$emit('polish', { type: 'experience', label: experience.role + ' · ' + experience.company, text: experience.description, context: { role: experience.role, company: experience.company } })">✨ 润色</button>
      </p>
      <ul v-if="experience.highlights?.length" class="exp-highlights">
        <li v-for="(h, i) in experience.highlights" :key="i">{{ h }}</li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  experience: { type: Object, required: true },
  index: { type: Number, default: -1 },
  editMode: { type: Boolean, default: false }
})
const emit = defineEmits(['update', 'delete', 'polish'])

const local = reactive({ role: '', company: '', _start: '', _end: '', description: '', highlights: [] })

watch(() => props.experience, (v) => {
  if (v) Object.assign(local, {
    role: v.role || '', company: v.company || '',
    _start: v.duration?.start || '', _end: v.duration?.end || '',
    description: v.description || '', highlights: [...(v.highlights || [])]
  })
}, { immediate: true })

watch(local, () => {
  emit('update', {
    role: local.role, company: local.company,
    duration: { start: local._start, end: local._end },
    description: local.description, highlights: local.highlights.filter(h => h.trim())
  })
}, { deep: true })
</script>

<style scoped>
.experience-item { padding: var(--space-md); background: var(--color-bg); border-radius: var(--radius-sm); border-left: 3px solid var(--blue); margin-bottom: var(--space-sm); }
.exp-header { display: flex; align-items: baseline; gap: var(--space-sm); margin-bottom: 2px; flex-wrap: wrap; }
.exp-role { font-family: var(--font-heading); font-size: var(--text-base); font-weight: 600; color: var(--color-text); }
.exp-company { font-size: var(--text-sm); color: var(--color-text-secondary); }
.exp-duration { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-sm); }
.exp-description { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.7; margin-bottom: var(--space-sm); }
.exp-highlights { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.exp-highlights li { position: relative; padding-left: 16px; font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; }
.exp-highlights li::before { content: '—'; position: absolute; left: 0; color: var(--color-text-muted); }
.polish-btn { display: inline-flex; align-items: center; gap: 2px; font-size: 0.65rem; color: var(--blue); background: rgba(43,127,216,.06); border: 1px solid rgba(43,127,216,.15); border-radius: 10px; padding: 1px 8px; cursor: pointer; font-family: var(--font-body); vertical-align: middle; margin-left: 4px; transition: all .15s; }
.polish-btn:hover { background: rgba(43,127,216,.14); border-color: var(--blue); }

/* Edit styles */
.exp-input { font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-body); }
.role-input { flex: 1; font-weight: 600; }
.company-input { flex: 1; }
.date-input { width: 100px; }
.exp-duration-row { display: flex; align-items: center; gap: var(--space-xs); margin-bottom: var(--space-sm); font-size: var(--text-xs); color: var(--color-text-muted); }
.exp-textarea { width: 100%; font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 6px 8px; font-family: var(--font-body); resize: vertical; margin-bottom: var(--space-sm); line-height: 1.5; }
.highlights-edit { display: flex; flex-direction: column; gap: var(--space-xs); }
.hl-row { display: flex; gap: var(--space-xs); align-items: center; }
.hl-input { flex: 1; }
.btn-del-exp, .btn-del-hl { font-size: 1rem; color: var(--red); background: none; border: none; cursor: pointer; padding: 0 4px; }
.btn-add-hl { font-size: 0.7rem; color: var(--blue); background: none; border: 1px dashed var(--blue); border-radius: var(--radius-sm); padding: 3px 8px; cursor: pointer; font-family: var(--font-body); align-self: flex-start; }
.btn-add-hl:hover { background: rgba(43,127,216,.06); }
</style>
