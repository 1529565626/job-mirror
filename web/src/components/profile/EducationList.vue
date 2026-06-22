<!-- EducationList.vue — 教育背景列表 -->
<template>
  <section class="card education-list">
    <h2 class="section-title">教育背景 <span class="count">{{ education.length }} 条</span></h2>
    <button v-if="editMode" class="btn-add" @click="addEdu">+ 新增教育</button>
    <div v-if="education.length === 0" class="empty-text">暂无教育背景</div>
    <div v-else class="education-container">
      <EducationItem
        v-for="(edu, index) in education" :key="index"
        :education="edu" :edit-mode="editMode"
        @update="v => updateEdu(index, v)"
        @delete="deleteEdu(index)"
      />
    </div>
  </section>
</template>

<script setup>
import EducationItem from './EducationItem.vue'
const props = defineProps({ education: { type: Array, default: () => [] }, editMode: { type: Boolean, default: false } })
const emit = defineEmits(['update:education'])
function addEdu() {
  const all = [...props.education]
  all.push({ school: '', degree: '本科', major: '', graduationYear: new Date().getFullYear() })
  emit('update:education', all)
}
function updateEdu(idx, val) { const all = [...props.education]; all[idx] = val; emit('update:education', all) }
function deleteEdu(idx) { const all = [...props.education]; all.splice(idx, 1); emit('update:education', all) }
</script>

<style scoped>
.count { font-size: var(--text-sm); font-weight: 400; color: var(--color-text-muted); margin-left: var(--space-sm); }
.education-container { display: flex; flex-direction: column; gap: var(--space-md); }
.empty-text { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-lg); }
.btn-add { display: block; width: 100%; padding: 8px; margin-bottom: 12px; font-size: 0.8rem; color: var(--blue); background: var(--color-primary-bg); border: 1px dashed var(--blue); border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body); }
.btn-add:hover { background: rgba(43,127,216,.12); }
</style>
