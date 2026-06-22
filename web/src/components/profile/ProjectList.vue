<!-- ProjectList.vue — 项目经历列表 -->
<template>
  <section class="card project-list">
    <h2 class="section-title">项目经历 <span class="count">{{ projects.length }} 项</span></h2>
    <button v-if="editMode" class="btn-add" @click="addProj">+ 新增项目</button>
    <div v-if="projects.length === 0" class="empty-text">暂无项目经历</div>
    <div v-else class="projects-container">
      <ProjectItem
        v-for="(proj, index) in projects" :key="index"
        :project="proj" :index="index" :edit-mode="editMode"
        @update="v => updateProj(index, v)"
        @delete="deleteProj(index)"
        @polish="(e) => $emit('polish', { ...e, index })"
      />
    </div>
  </section>
</template>

<script setup>
import ProjectItem from './ProjectItem.vue'
const props = defineProps({ projects: { type: Array, default: () => [] }, editMode: { type: Boolean, default: false } })
const emit = defineEmits(['update:projects', 'polish'])
function addProj() {
  const all = [...props.projects]
  all.push({ name: '', role: '', duration: { start: '', end: '' }, description: '', highlights: [], techStack: [] })
  emit('update:projects', all)
}
function updateProj(idx, val) { const all = [...props.projects]; all[idx] = val; emit('update:projects', all) }
function deleteProj(idx) { const all = [...props.projects]; all.splice(idx, 1); emit('update:projects', all) }
</script>

<style scoped>
.count { font-size: var(--text-sm); font-weight: 400; color: var(--color-text-muted); margin-left: var(--space-sm); font-family: var(--font-body); }
.projects-container { display: flex; flex-direction: column; gap: var(--space-md); }
.empty-text { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-lg); }
.btn-add { display: block; width: 100%; padding: 8px; margin-bottom: 12px; font-size: 0.8rem; color: var(--blue); background: var(--color-primary-bg); border: 1px dashed var(--blue); border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body); }
.btn-add:hover { background: rgba(43,127,216,.12); }
</style>
