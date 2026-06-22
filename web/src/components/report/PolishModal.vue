<!-- PolishModal.vue — AI润色对比弹窗：原文 vs 润色后，用户选择 -->
<template>
  <teleport to="body">
    <div v-if="visible" class="polish-overlay" @click.self="onCancel">
      <div class="polish-modal">
        <!-- 头部 -->
        <div class="polish-header">
          <h3 class="polish-title">AI 润色 · {{ itemLabel }}</h3>
          <button class="polish-close" @click="onCancel">&times;</button>
        </div>

        <!-- 状态：AI 润色中 -->
        <div v-if="phase === 'submitting'" class="polish-status">
          <div class="spinner"></div>
          <p class="polish-wait-title">AI 正在润色...</p>
          <p class="polish-hint">通常需要 10-30 秒，请耐心等待</p>
        </div>

        <!-- 状态：完成，显示对比 -->
        <div v-else-if="phase === 'done'" class="polish-compare">
          <div class="compare-cols">
            <!-- 原文 -->
            <div class="compare-col">
              <div class="compare-label original-label">原文</div>
              <div class="compare-text original-text">{{ originalText }}</div>
            </div>
            <!-- 润色后 -->
            <div class="compare-col">
              <div class="compare-label polished-label">AI 润色后</div>
              <div class="compare-text polished-text">{{ polishedText }}</div>
            </div>
          </div>

          <div class="polish-actions">
            <button class="btn btn-reject" @click="onCancel">保留原文</button>
            <button class="btn btn-accept" @click="onAccept">采用润色结果</button>
          </div>
        </div>

        <!-- 状态：出错 -->
        <div v-else-if="phase === 'error'" class="polish-status">
          <p class="polish-error">{{ errorMsg }}</p>
          <button class="btn btn-reject" @click="onCancel">关闭</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { api } from '@/services/api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  itemType: { type: String, default: '' },   // 'project' | 'experience'
  itemLabel: { type: String, default: '' },   // 卡片标题
  originalText: { type: String, default: '' },
  context: { type: Object, default: () => ({}) } // 额外上下文
})

const emit = defineEmits(['update:visible', 'accept'])

const phase = ref('submitting')
const polishedText = ref('')
const errorMsg = ref('')

async function submitPolish() {
  phase.value = 'submitting'
  try {
    const res = await api.post('/api/polish', {
      itemType: props.itemType,
      itemLabel: props.itemLabel,
      originalText: props.originalText,
      context: props.context
    })
    if (res.ok) {
      polishedText.value = res.polishedText
      phase.value = 'done'
    } else {
      errorMsg.value = res.error || '润色失败'
      phase.value = 'error'
    }
  } catch (e) {
    errorMsg.value = '请求失败：' + e.message
    phase.value = 'error'
  }
}

function onAccept() {
  emit('accept', {
    itemType: props.itemType,
    originalText: props.originalText,
    polishedText: polishedText.value
  })
  emit('update:visible', false)
}

function onCancel() {
  emit('update:visible', false)
}

watch(() => props.visible, (v) => {
  if (v && props.originalText) submitPolish()
  else phase.value = 'submitting'
})
</script>

<style scoped>
.polish-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.polish-modal {
  width: min(860px, 92vw);
  max-height: 85vh;
  background: var(--color-surface, #fff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,.12));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.polish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md, 16px) var(--space-lg, 24px);
  border-bottom: 1px solid var(--color-border, rgba(26,26,26,.07));
}

.polish-title {
  font-family: var(--font-heading, 'Noto Serif SC', serif);
  font-size: var(--text-lg, 1.15rem);
  font-weight: 700;
  color: var(--color-text, #1A1A2E);
  margin: 0;
}

.polish-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: var(--color-text-muted, #8A8A9A);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.polish-close:hover { color: var(--red, #E84A5F); }

/* 状态区 */
.polish-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl, 48px) var(--space-lg, 24px);
  text-align: center;
  gap: var(--space-md, 16px);
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--color-border, rgba(26,26,26,.07));
  border-top-color: var(--blue, #2B7FD8);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.polish-wait-title {
  font-size: var(--text-base, 1rem);
  font-weight: 600;
  color: var(--color-text, #1A1A2E);
  margin: 0;
}

.polish-hint {
  font-size: var(--text-sm, .85rem);
  color: var(--color-text-muted, #8A8A9A);
  margin: 0;
}

.polish-hint code {
  font-family: var(--font-mono, monospace);
  background: var(--color-primary-bg, rgba(43,127,216,.08));
  color: var(--blue, #2B7FD8);
  padding: 2px 10px;
  border-radius: 4px;
  font-size: .9em;
}

.polish-error {
  color: var(--red, #E84A5F);
  font-size: var(--text-sm, .85rem);
}

/* 对比区 */
.polish-compare {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: var(--space-md, 16px) var(--space-lg, 24px);
  overflow-y: auto;
}

.compare-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md, 16px);
  flex: 1;
  min-height: 0;
}

.compare-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.compare-label {
  font-size: var(--text-xs, .75rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 4px 12px;
  border-radius: var(--radius-sm, 8px) var(--radius-sm, 8px) 0 0;
}

.original-label {
  background: rgba(26,26,26,.06);
  color: var(--color-text-muted, #8A8A9A);
}

.polished-label {
  background: rgba(43,127,216,.1);
  color: var(--blue, #2B7FD8);
}

.compare-text {
  flex: 1;
  min-height: 180px;
  max-height: 380px;
  overflow-y: auto;
  padding: var(--space-md, 16px);
  font-size: var(--text-sm, .85rem);
  line-height: 1.7;
  white-space: pre-wrap;
  border: 1px solid var(--color-border, rgba(26,26,26,.07));
  border-top: none;
  border-radius: 0 0 var(--radius-sm, 8px) var(--radius-sm, 8px);
}

.original-text {
  background: rgba(26,26,26,.015);
  color: var(--color-text-secondary, #4A4A5A);
}

.polished-text {
  background: rgba(43,127,216,.025);
  color: var(--color-text, #1A1A2E);
}

/* 操作按钮 */
.polish-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm, 8px);
  padding-top: var(--space-md, 16px);
  margin-top: var(--space-sm, 8px);
  border-top: 1px solid var(--color-border, rgba(26,26,26,.07));
}

.btn {
  padding: 8px 24px;
  font-size: var(--text-sm, .85rem);
  font-weight: 600;
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  border: none;
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: all .15s;
}

.btn-reject {
  background: var(--color-bg, #fefcf6);
  color: var(--color-text-secondary, #4A4A5A);
  border: 1px solid var(--color-border, rgba(26,26,26,.07));
}

.btn-reject:hover {
  border-color: var(--red, #E84A5F);
  color: var(--red, #E84A5F);
}

.btn-accept {
  background: var(--blue, #2B7FD8);
  color: #fff;
}

.btn-accept:hover {
  background: #2370c0;
}
</style>
