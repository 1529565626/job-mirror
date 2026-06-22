<!-- EducationItem.vue — 教育背景（支持编辑） -->
<template>
  <div class="education-item">
    <template v-if="editMode">
      <div class="edu-header">
        <input v-model="local.school" class="edu-input school-input" placeholder="学校" />
        <button class="btn-del-edu" @click="$emit('delete')">×</button>
      </div>
      <div class="edu-row">
        <select v-model="local.degree" class="edu-select">
          <option v-for="d in degrees" :key="d" :value="d">{{ d }}</option>
        </select>
        <input v-model="local.major" class="edu-input" placeholder="专业" />
        <input v-model.number="local.graduationYear" class="edu-input year-input" type="number" placeholder="毕业年" min="1980" max="2030" />
      </div>
    </template>
    <template v-else>
      <h3 class="edu-school">{{ education.school }}</h3>
      <div class="edu-detail">
        <span>{{ education.degree }}</span><span class="edu-sep">·</span>
        <span>{{ education.major }}</span><span class="edu-sep">·</span>
        <span>{{ education.graduationYear }} 年毕业</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
const props = defineProps({ education: { type: Object, required: true }, editMode: { type: Boolean, default: false } })
const emit = defineEmits(['update', 'delete'])
const degrees = ['高中', '大专', '本科', '硕士', '博士', 'MBA']
const local = reactive({ school: '', degree: '本科', major: '', graduationYear: new Date().getFullYear() })
watch(() => props.education, (v) => {
  if (v) Object.assign(local, { school: v.school || '', degree: v.degree || '本科', major: v.major || '', graduationYear: v.graduationYear || new Date().getFullYear() })
}, { immediate: true })
watch(local, () => emit('update', { ...local }), { deep: true })
</script>

<style scoped>
.education-item { padding: var(--space-md); background: var(--color-bg); border-radius: var(--radius-sm); margin-bottom: var(--space-sm); }
.edu-school { font-size: var(--text-base); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-xs); }
.edu-detail { font-size: var(--text-sm); color: var(--color-text-secondary); display: flex; align-items: center; gap: var(--space-xs); }
.edu-sep { color: var(--color-text-muted); }

.edu-input { font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-body); }
.school-input { flex: 1; font-weight: 600; }
.year-input { width: 70px; }
.edu-header { display: flex; align-items: center; gap: var(--space-xs); margin-bottom: var(--space-xs); }
.edu-row { display: flex; align-items: center; gap: var(--space-xs); }
.edu-select { font-size: 0.8rem; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-body); }
.btn-del-edu { font-size: 1rem; color: var(--red); background: none; border: none; cursor: pointer; padding: 0 4px; }
</style>
