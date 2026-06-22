<!-- BasicInfo.vue — 基本信息卡片（支持编辑） -->
<template>
  <section class="card basic-info">
    <h2 class="section-title">基本信息</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">姓名</span>
        <input v-if="editMode" v-model="local.name" class="info-input" placeholder="未填写" />
        <span v-else class="info-value">{{ basic.name || '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">行业</span>
        <input v-if="editMode" v-model="local.industry" class="info-input" placeholder="如：互联网/金融" />
        <span v-else class="info-value">{{ basic.industry || '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">工作年限</span>
        <input v-if="editMode" v-model.number="local.yearsOfExperience" class="info-input" type="number" min="0" />
        <span v-else class="info-value">{{ basic.yearsOfExperience ? basic.yearsOfExperience + ' 年' : '未填写' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">当前职位</span>
        <input v-if="editMode" v-model="local.currentRole" class="info-input" placeholder="如：Java 开发工程师" />
        <span v-else class="info-value">{{ basic.currentRole || '未填写' }}</span>
      </div>
    </div>
    <div class="target-roles">
      <span class="info-label">目标职位</span>
      <template v-if="editMode">
        <input v-model="targetRolesText" class="info-input" placeholder="用逗号分隔，如：高级Java开发,AI工程师" style="flex:1" />
      </template>
      <template v-else>
        <span v-if="basic.targetRoles?.length" v-for="role in basic.targetRoles" :key="role" class="tag">{{ role }}</span>
        <span v-else class="info-value">未填写</span>
      </template>
    </div>
    <div class="summary-row">
      <span class="info-label">一句话总结</span>
      <textarea v-if="editMode" v-model="local.summary" class="info-textarea" rows="2" placeholder="一句话概括你的核心优势"></textarea>
      <p v-else class="summary">{{ basic.summary || '未填写' }}</p>
    </div>
  </section>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  basic: { type: Object, default: () => ({}) },
  editMode: { type: Boolean, default: false }
})

const emit = defineEmits(['update:basic'])

const local = reactive({
  name: '', industry: '', yearsOfExperience: 0, currentRole: '', targetRoles: [], summary: ''
})

const targetRolesText = computed({
  get: () => (local.targetRoles || []).join('，'),
  set: (v) => { local.targetRoles = v.split(/[,，]/).map(s => s.trim()).filter(Boolean) }
})

watch(() => props.basic, (v) => {
  if (v) Object.assign(local, { name: '', industry: '', yearsOfExperience: 0, currentRole: '', targetRoles: [], summary: '', ...v })
}, { immediate: true })

watch(local, (v) => emit('update:basic', { ...v }), { deep: true })
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--text-base);
  color: var(--color-text);
}

.info-input, .info-textarea {
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-family: var(--font-body);
  width: 100%;
}

.info-textarea {
  resize: vertical;
  line-height: 1.5;
}

.target-roles {
  margin-top: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.summary-row {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
