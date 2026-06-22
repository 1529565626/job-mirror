<!-- JDPage.vue — 岗位列表 + JD 录入 + 分析状态追踪 -->
<template>
  <div class="jd-page">
    <h1 class="page-title">岗位管理</h1>

    <!-- 加载态 -->
    <LoadingSpinner v-if="store.loading && store.isEmpty" text="加载岗位列表中..." />

    <!-- 错误态 -->
    <ErrorState
      v-else-if="store.error && store.isEmpty"
      :message="store.error"
      @retry="store.fetchList()"
    />

    <template v-else>
      <!-- 内联错误 -->
      <div v-if="store.error" class="error-banner">
        <span>{{ store.error }}</span>
        <button class="btn-retry" @click="store.fetchList()">重试</button>
      </div>

      <!-- ====== JD 录入区 ====== -->
      <div class="jd-input-section card">
        <button class="collapse-toggle" @click="showForm = !showForm">
          <span class="toggle-icon">{{ showForm ? '▼' : '▶' }}</span>
          <span>{{ showForm ? '收起录入' : '录入新岗位' }}</span>
        </button>

        <div v-if="showForm" class="jd-form">
          <!-- 录入表单 -->
          <template v-if="!analyzingId">
            <div class="form-group">
              <label class="form-label" for="jd-title">岗位名称</label>
              <input
                id="jd-title"
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="例：高级产品经理"
                :disabled="isSaving"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="jd-text">岗位描述 (JD)</label>
              <textarea
                id="jd-text"
                v-model="form.rawText"
                class="form-textarea"
                rows="10"
                placeholder="粘贴完整的岗位描述文本..."
                :disabled="isSaving"
              ></textarea>
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary"
                :disabled="!canSubmit || isSaving"
                @click="handleAnalyze"
              >
                {{ isSaving ? '保存中...' : '开始分析' }}
              </button>
              <span v-if="formError" class="form-error">{{ formError }}</span>
            </div>
          </template>

          <!-- 分析进行中 -->
          <template v-else>
            <div class="analyzing-state">
              <div class="spinner"></div>
              <p class="analyzing-title">AI 正在分析岗位</p>
              <p class="analyzing-current">{{ progress.current || '正在连接…' }}</p>

              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>

              <div class="progress-steps">
                <div v-for="s in analysisSteps" :key="s.label" class="progress-step" :class="{ 'step-done': s.done }">
                  <span class="step-icon">{{ s.done ? '✓' : s.active ? '◉' : '○' }}</span>
                  <span class="step-label">{{ s.label }}</span>
                </div>
              </div>

              <details class="log-panel" @toggle="onLogToggle">
                <summary class="log-toggle"><span>查看执行日志</span><span class="log-status">{{ logLines }} 行</span></summary>
                <pre class="log-content">{{ logText || '(加载中…)' }}</pre>
              </details>

              <p class="analyzing-wait">
                <span class="pulse-dot"></span>
                约需 60-90 秒{{ '.'.repeat(waitingDots) }}
              </p>
              <button class="btn-dismiss" @click="cancelAnalysis">取消</button>
            </div>
          </template>

          <!-- 分析完成 -->
          <div v-if="analysisDone" class="analysis-done">
            <div class="done-icon">&#10003;</div>
            <p class="done-title">分析完成！</p>
            <p class="done-desc">岗位「{{ analysisDoneTitle }}」的对标报告已生成</p>
            <RouterLink :to="`/reports/${analysisDoneId}`" class="btn btn-primary">
              查看分析报告 →
            </RouterLink>
            <button class="btn-dismiss" @click="resetAnalysis">录入下一个岗位</button>
          </div>
        </div>
      </div>

      <!-- ====== 空态 ====== -->
      <EmptyState
        v-if="store.isEmpty && !showForm"
        icon="briefcase"
        title="还没有保存岗位"
        description="点击上方「录入新岗位」开始"
      />

      <!-- ====== 岗位列表 ====== -->
      <JDList
        v-if="!store.isEmpty"
        :list="store.list"
        @delete="handleDelete"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useJDsStore } from '@/stores/jds'
import { api } from '@/services/api'
import JDList from '@/components/jd/JDList.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const store = useJDsStore()

const showForm = ref(false)
const isSaving = ref(false)
const formError = ref('')

const form = reactive({ title: '', rawText: '' })
const canSubmit = computed(() => form.rawText.trim().length > 0 && form.title.trim().length > 0)

// 分析状态
const analyzingId = ref(null)
const analyzingTitle = ref('')
const analysisDone = ref(false)
const analysisDoneId = ref(null)
const analysisDoneTitle = ref('')
const waitingDots = ref(0)

// 进度追踪
const progress = ref({ status: 'idle', steps: [], current: '' })
const logText = ref('')
const logLines = computed(() => logText.value ? logText.value.split('\n').length : 0)

const milestoneLabels = ['解析JD', '技能对标', '计算匹配度', '生成报告']
const analysisSteps = computed(() => {
  return milestoneLabels.map(label => ({
    label,
    done: progress.value.steps.some(s => s.text.includes(label)),
    active: false
  }))
})

const progressPercent = computed(() => {
  const done = progress.value.steps.length
  return Math.min(100, Math.max(5, Math.round((done / milestoneLabels.length) * 100)))
})

let dotsTimer = null
let pollTimer = null
let progressTimer = null

function startDots() {
  dotsTimer = setInterval(() => { waitingDots.value = (waitingDots.value % 3) + 1 }, 600)
}

function stopDots() {
  if (dotsTimer) { clearInterval(dotsTimer); dotsTimer = null }
  waitingDots.value = 0
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}

// 开始分析（保存 JD + 自动触发 Claude 分析）
async function handleAnalyze() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true; formError.value = ''

  const id = await store.create({ title: form.title, rawText: form.rawText })
  isSaving.value = false

  if (!id) { formError.value = store.error || '保存失败'; return }

  analyzingId.value = id; analyzingTitle.value = form.title; analysisDone.value = false
  startDots()
  store.saveAnalysisState({ status: 'waiting', jdId: id, title: form.title, startedAt: new Date().toISOString() })

  // 自动触发后台分析
  try {
    const result = await api.post(`/api/jds/${encodeURIComponent(id)}/process`)
    if (!result.ok) { formError.value = result.error || '启动分析失败'; return }
  } catch (e) { formError.value = '启动分析失败: ' + e.message; return }

  // 轮询进度和结果
  const check = async () => {
    try {
      const res = await api.get(`/api/jds/${encodeURIComponent(id)}/progress`)
      if (res) progress.value = res
      if (res.status === 'done') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        await store.fetchList()
        analysisDoneId.value = id; analysisDoneTitle.value = form.title; analysisDone.value = true; analyzingId.value = null
      }
    } catch {}
  }
  check()
  pollTimer = setInterval(check, 2000)

  // 日志轮询
  progressTimer = setInterval(async () => {
    if (logText.value === '(加载中…)' || (typeof logText.value === 'string' && logText.value.length >= 0)) {
      try { const res = await api.get(`/api/jds/${encodeURIComponent(id)}/log`); if (res?.text) logText.value = res.text } catch {}
    }
  }, 3000)
}

function onLogToggle(e) {
  if (e.target.open && (!logText.value || logText.value === '(暂无日志)')) {
    logText.value = '(加载中…)'
    api.get(`/api/jds/${encodeURIComponent(analyzingId.value)}/log`).then(res => {
      if (res?.text) logText.value = res.text
    }).catch(() => { logText.value = '(加载失败)' })
  }
}

function cancelAnalysis() { stopPolling(); stopDots(); store.clearAnalysisState(); analyzingId.value = null; analysisDone.value = false }
function resetAnalysis() { analysisDone.value = false; analysisDoneId.value = null; form.title = ''; form.rawText = ''; formError.value = '' }

function handleDelete(id) {
  store.remove(id)
}

onMounted(async () => {
  store.fetchList()

  // 恢复持久化的分析等待状态
  const saved = await store.getAnalysisState()
  if (saved && saved.status === 'waiting') {
    // 先检查是否已经分析完了
    try {
      const jd = await store.fetchOne(saved.jdId)
      if (jd && jd.parsed) {
        store.clearAnalysisState()
        return
      }
    } catch {}
    analyzingId.value = saved.jdId
    analyzingTitle.value = saved.title || ''
    showForm.value = true
    startPollingJD(saved.jdId)
  }
})

onUnmounted(() => {
  stopPolling()
  stopDots()
})
</script>

<style scoped>
.jd-page {
  width: 100%;
}

/* === 内联错误条 === */
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-danger);
  margin-bottom: var(--space-md);
}

.btn-retry {
  font-size: var(--text-xs);
  color: var(--color-danger);
  font-weight: 600;
  padding: 2px 8px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: transparent;
  transition: background 0.15s;
}

.btn-retry:hover {
  background: var(--color-danger);
  color: #fff;
}

/* === 可折叠录入区 === */
.jd-input-section {
  margin-bottom: var(--space-lg);
}

.collapse-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--blue);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  font-family: var(--font-body);
}

.toggle-icon {
  font-size: var(--text-xs);
}

.jd-form {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.95rem;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;
  font-family: var(--font-body);
}

.form-input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(43, 127, 216, 0.1);
}

.form-textarea {
  width: 100%;
  padding: var(--space-md);
  font-size: var(--text-sm);
  line-height: 1.6;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  outline: none;
  font-family: var(--font-body);
  transition: border-color 0.15s;
}

.form-textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(43, 127, 216, 0.1);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.form-error {
  font-size: var(--text-sm);
  color: var(--color-danger);
}

/* === 分析等待态 === */
.analyzing-state {
  text-align: center;
  padding: var(--space-lg) 0;
}

.analyzing-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  margin: var(--space-md) 0 var(--space-xs);
}

.analyzing-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
}

.analyzing-current {
  font-size: var(--text-sm);
  color: var(--blue);
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.analyzing-wait {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-md);
}

/* 进度条 */
.progress-bar-wrap {
  width: 100%; max-width: 360px; margin: 0 auto var(--space-md);
  height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden;
}
.progress-bar-fill { height: 100%; background: var(--blue); border-radius: 2px; transition: width 0.6s ease; }

/* 步骤列表 */
.progress-steps { display: flex; flex-direction: column; gap: 2px; max-width: 360px; margin: 0 auto var(--space-md); }
.progress-step { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--text-sm); color: var(--color-text-muted); padding: 2px var(--space-sm); border-radius: var(--radius-sm); }
.step-done { color: var(--color-success); }
.step-icon { font-size: var(--text-xs); width: 18px; text-align: center; flex-shrink: 0; }
.step-label { flex: 1; }

/* 日志面板 */
.log-panel { max-width: 420px; margin: var(--space-md) auto 0; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; }
.log-toggle { padding: var(--space-sm) var(--space-md); background: var(--color-surface); cursor: pointer; font-size: var(--text-xs); color: var(--color-text-muted); display: flex; justify-content: space-between; align-items: center; }
.log-toggle:hover { background: var(--color-primary-bg); }
.log-status { font-size: 0.65rem; color: var(--color-text-muted); font-family: monospace; }
.log-content { margin: 0; padding: var(--space-sm) var(--space-md); font-size: 0.6rem; font-family: monospace; line-height: 1.5; background: #1a1a2e; color: #a0d0ff; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }

.terminal-cmd {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-text);
  color: #fff;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.terminal-cmd code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.btn-copy {
  padding: 2px 8px;
  font-size: var(--text-xs);
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.btn-copy:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* === 分析完成 === */
.analysis-done {
  text-align: center;
  padding: var(--space-lg) 0;
}

.done-icon {
  font-size: 2.5rem;
  color: var(--color-success);
  line-height: 1;
  margin-bottom: var(--space-md);
}

.done-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.done-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.btn-dismiss {
  display: block;
  margin: var(--space-md) auto 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-body);
}

.btn-dismiss:hover {
  color: var(--blue);
}

/* === 脉冲点 === */
.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--blue);
  vertical-align: middle;
  margin-right: 4px;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

/* === spinner === */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
