<!-- ExperienceList.vue — 工作经历列表 -->
<template>
  <section class="card experience-list">
    <h2 class="section-title">
      工作经历
      <span class="count">{{ experiences.length }} 段</span>
    </h2>
    <button v-if="editMode" class="btn-add-exp" @click="addExp">+ 新增经历</button>
    <div v-if="experiences.length === 0" class="empty-text">暂无工作经历</div>
    <div v-else class="experiences-container">
      <ExperienceItem
        v-for="(exp, index) in experiences"
        :key="index"
        :experience="exp"
        :index="index"
        :edit-mode="editMode"
        @update="v => updateExp(index, v)"
        @delete="deleteExp(index)"
        @polish="(e) => $emit('polish', { ...e, index })"
      />
    </div>
  </section>
</template>

<script setup>
import ExperienceItem from './ExperienceItem.vue'

const props = defineProps({
  experiences: { type: Array, default: () => [] },
  editMode: { type: Boolean, default: false }
})
const emit = defineEmits(['update:experiences', 'polish'])

function addExp() {
  const all = [...props.experiences]
  all.push({ company: '', role: '', duration: { start: '', end: '' }, description: '', highlights: [] })
  emit('update:experiences', all)
}

function updateExp(idx, val) {
  const all = [...props.experiences]
  all[idx] = val
  emit('update:experiences', all)
}

function deleteExp(idx) {
  const all = [...props.experiences]
  all.splice(idx, 1)
  emit('update:experiences', all)
}
</script>

<style scoped>
.count { font-size: var(--text-sm); font-weight: 400; color: var(--color-text-muted); margin-left: var(--space-sm); font-family: var(--font-body); }
.experiences-container { display: flex; flex-direction: column; gap: var(--space-md); }
.empty-text { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-lg); }
.btn-add-exp { display: block; width: 100%; padding: 8px; margin-bottom: 12px; font-size: 0.8rem; color: var(--blue); background: var(--color-primary-bg); border: 1px dashed var(--blue); border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body); }
.btn-add-exp:hover { background: rgba(43,127,216,.12); }
</style>
