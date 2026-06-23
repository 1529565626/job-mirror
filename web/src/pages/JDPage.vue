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

          <!-- 分析进行中 / 出错 / 超时 -->
          <template v-else>
            <div class="analyzing-state">

              <!-- ====== 正常运行中 ====== -->
              <template v-if="analysisPhase === 'running'">
                <div class="spinner"></div>
                <p class="analyzing-title">AI 正在分析岗位</p>
                <p class="analyzing-current">{{ progress.current || '正在连接…' }}</p>

                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
                </div>

                <div class="progress-steps">
                  <div v-for="(s, i) in analysisSteps" :key="i" class="progress-step" :class="{ 'step-done': s.done, 'step-active': s.active }">
                    <span class="step-icon">{{ s.done ? '✓' : s.active ? '◉' : '○' }}</span>
                    <span class="step-label">{{ s.label }}</span>
                  </div>
                </div>

                <p class="analyzing-elapsed">
                  ⏱ 已耗时 {{ elapsedStr }} / 最长 5:00
                </p>

                <!-- 执行日志窗口 -->
                <div class="debug-panel">
                  <div class="debug-header">
                    <span class="debug-title">📋 执行日志</span>
                    <span class="tab-badge">{{ logLines }} 行</span>
                    <button class="debug-btn-copy" @click="copyFullLog">复制全部</button>
                    <span class="debug-copied" v-if="debugCopied">已复制 ✓</span>
                  </div>
                  <div class="debug-body">
                    <pre class="debug-code response-code">{{ logText || '(加载中…)' }}</pre>
                  </div>
                </div>

                <div class="analyzing-actions">
                  <button class="btn-verify" @click="verifyStatus">刷新状态</button>
                  <button class="btn-dismiss" @click="cancelAnalysis">取消分析</button>
                </div>
              </template>

              <!-- ====== 分析失败 ====== -->
              <div v-else-if="analysisPhase === 'error'" class="result-state result-error">
                <div class="result-icon">✗</div>
                <p class="result-title">分析失败</p>
                <p class="result-desc">{{ progress.current || 'Claude 进程异常退出' }}</p>
                <div class="result-actions">
                  <button class="btn btn-primary" @click="retryAnalysis" :disabled="isRetrying">
                    {{ isRetrying ? '重试中…' : '重新分析' }}
                  </button>
                  <button class="btn-verify" @click="verifyStatus">校验状态</button>
                  <button class="btn-dismiss" @click="resetAnalysis">关闭</button>
                </div>
              </div>

              <!-- ====== 分析超时 ====== -->
              <div v-else-if="analysisPhase === 'timeout'" class="result-state result-timeout">
                <div class="result-icon">⏱</div>
                <p class="result-title">分析超时</p>
                <p class="result-desc">{{ progress.current || 'AI 引擎处理超过 5 分钟，已自动终止' }}</p>
                <div class="result-actions">
                  <button class="btn btn-primary" @click="retryAnalysis" :disabled="isRetrying">
                    {{ isRetrying ? '重试中…' : '重新分析' }}
                  </button>
                  <button class="btn-verify" @click="verifyStatus">校验状态</button>
                  <button class="btn-dismiss" @click="resetAnalysis">关闭</button>
                </div>
              </div>

              <!-- ====== 已取消 ====== -->
              <div v-else-if="analysisPhase === 'cancelled'" class="result-state result-cancelled">
                <div class="result-icon">⊘</div>
                <p class="result-title">已取消</p>
                <p class="result-desc">分析已被手动取消</p>
                <div class="result-actions">
                  <button class="btn btn-primary" @click="retryAnalysis" :disabled="isRetrying">
                    {{ isRetrying ? '重试中…' : '重新分析' }}
                  </button>
                  <button class="btn-dismiss" @click="resetAnalysis">关闭</button>
                </div>
              </div>

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
        @analyze="handleAnalyzeExisting"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useJDsStore } from '@/stores/jds'
import { api } from '@/services/api'
import JDList from '@/components/jd/JDList.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const route = useRoute()
const router = useRouter()
const store = useJDsStore()

const showForm = ref(false)
const isSaving = ref(false)
const formError = ref('')

const form = reactive({ title: '', rawText: '' })
const canSubmit = computed(() => form.rawText.trim().length > 0 && form.title.trim().length > 0)

// 分析状态
const analyzingId = ref(null)
const analyzingTitle = ref('')
const analysisPhase = ref('') // '' | 'running' | 'error' | 'timeout' | 'cancelled' | 'done'
const analysisDone = ref(false)
const analysisDoneId = ref(null)
const analysisDoneTitle = ref('')
const waitingDots = ref(0)
const isRetrying = ref(false)
const elapsedSec = ref(0)
let elapsedTimer = null

const elapsedStr = computed(() => {
  const m = Math.floor(elapsedSec.value / 60)
  const s = elapsedSec.value % 60
  return m + ':' + String(s).padStart(2, '0')
})

function startElapsed() {
  elapsedSec.value = 0
  elapsedTimer = setInterval(() => { elapsedSec.value++ }, 1000)
}

function stopElapsed() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

// 进度追踪
const progress = ref({ status: 'idle', steps: [], current: '' })
const logText = ref('')
const logLines = computed(() => logText.value ? logText.value.split('\n').length : 0)
const debugCopied = ref(false)

async function copyFullLog() {
  try {
    await navigator.clipboard.writeText(logText.value || '')
    debugCopied.value = true
    setTimeout(() => { debugCopied.value = false }, 2000)
  } catch {}
}

const stepLabels = ['解析JD', '技能对标', '计算匹配度', '生成报告', '写入报告']
const analysisSteps = computed(() => {
  const steps = progress.value.steps || []
  let reachedUndone = false
  return stepLabels.map((label, i) => {
    const found = steps.find(s => s.text.includes('步骤' + (i + 1)))
    let detail = ''
    if (found) {
      detail = found.text.replace(/^✓\s*步骤\d\/\d完成\s*[—\-]?\s*/, '')
      // 步骤1 清理 PARSED JSON 块
      if (i === 0) {
        detail = detail.replace(/\s*\|\s*PARSED:.*$/, '')
        if (!detail) detail = '已提取'
      }
      // 截断过长 detail
      if (detail.length > 80) detail = detail.substring(0, 77) + '...'
    }
    const done = !!found
    const active = !done && !reachedUndone && steps.length > 0 && (reachedUndone = true)
    return { label, done, active, detail }
  })
})

const progressPercent = computed(() => {
  const done = analysisSteps.value.filter(s => s.done).length
  return Math.min(100, Math.max(5, Math.round((done / stepLabels.length) * 100)))
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
  stopElapsed()
}

// 对已有 JD 直接触发分析（跳过保存步骤）
async function handleAnalyzeExisting(jdId) {
  if (!jdId) return
  stopPolling(); stopDots(); store.clearAnalysisState()
  // 获取 JD 标题用于展示
  let title = jdId
  try { const jd = await store.fetchOne(jdId); if (jd) title = jd.title || jdId } catch {}
  analyzingId.value = jdId; analyzingTitle.value = title; analysisDone.value = false
  analysisPhase.value = 'running'
  showForm.value = true
  startDots(); startElapsed()
  store.saveAnalysisState({ status: 'waiting', jdId, title, startedAt: new Date().toISOString() })

  try {
    const result = await api.post(`/api/jds/${encodeURIComponent(jdId)}/process`)
    if (!result.ok) { formError.value = result.error || '启动分析失败'; return }
  } catch (e) { formError.value = '启动分析失败: ' + e.message; return }

  const check = async () => {
    try {
      const res = await api.get(`/api/jds/${encodeURIComponent(jdId)}/progress`)
      if (res) progress.value = res
      if (res.status === 'done') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        await store.fetchList()
        analysisDoneId.value = jdId; analysisDoneTitle.value = title; analysisDone.value = true; analyzingId.value = null
      } else if (res.status === 'error') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'error'
      } else if (res.status === 'timeout') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'timeout'
      } else if (res.status === 'cancelled') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'cancelled'
      }
    } catch {}
  }
  check()
  pollTimer = setInterval(check, 2000)
  progressTimer = setInterval(async () => {
    try { const res = await api.get(`/api/jds/${encodeURIComponent(jdId)}/log`); if (res?.text) logText.value = res.text } catch {}
  }, 2000)
  setTimeout(() => {
    if (analysisPhase.value === 'running') {
      stopPolling(); stopDots(); store.clearAnalysisState()
      analysisPhase.value = 'timeout'
      progress.value = { ...progress.value, status: 'timeout', current: '分析超时 (前端强制终止轮询)' }
    }
  }, 360000)
}

// 开始分析（保存 JD + 自动触发 Claude 分析）
async function handleAnalyze() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true; formError.value = ''

  const id = await store.create({ title: form.title, rawText: form.rawText })
  isSaving.value = false

  if (!id) { formError.value = store.error || '保存失败'; return }

  analyzingId.value = id; analyzingTitle.value = form.title; analysisDone.value = false
  analysisPhase.value = 'running'
  startDots(); startElapsed()
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
      } else if (res.status === 'error') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'error'
      } else if (res.status === 'timeout') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'timeout'
      } else if (res.status === 'cancelled') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'cancelled'
      }
    } catch {}
  }
  check()
  pollTimer = setInterval(check, 2000)

  // 日志轮询
  progressTimer = setInterval(async () => {
    try { const res = await api.get(`/api/jds/${encodeURIComponent(id)}/log`); if (res?.text) logText.value = res.text } catch {}
  }, 2000)

  // 前端侧兜底超时（6 分钟强制停止轮询）
  setTimeout(() => {
    if (analysisPhase.value === 'running') {
      stopPolling(); stopDots(); store.clearAnalysisState()
      analysisPhase.value = 'timeout'
      progress.value = { ...progress.value, status: 'timeout', current: '分析超时 (前端强制终止轮询)' }
    }
  }, 360000)
}

async function cancelAnalysis() {
  // 真正杀掉服务端进程
  try { await api.post(`/api/jds/${encodeURIComponent(analyzingId.value)}/cancel`) } catch {}
  stopPolling(); stopDots(); store.clearAnalysisState()
  analysisPhase.value = 'cancelled'
}

async function verifyStatus() {
  if (!analyzingId.value) return
  try {
    const res = await api.post(`/api/jds/${encodeURIComponent(analyzingId.value)}/verify`)
    if (res) {
      // 根据校验结果更新本地状态
      if (res.status === 'ok') {
        // 实际已完成，但进度未反映
        await store.fetchList()
        analysisDoneId.value = analyzingId.value
        analysisDoneTitle.value = analyzingTitle.value
        analysisDone.value = true
        stopPolling(); stopDots(); store.clearAnalysisState()
      } else if (!res.canRetry) {
        // 仍在运行中
        analysisPhase.value = 'running'
        progress.value.current = '校验确认：服务端正运行中…'
      } else {
        // 可以重试
        progress.value = { ...progress.value, current: '校验结果：' + res.issues.map(i => i.msg).join('; ') }
      }
    }
  } catch (e) {
    progress.value = { ...progress.value, current: '校验请求失败: ' + e.message }
  }
}

async function retryAnalysis() {
  if (!analyzingId.value || isRetrying.value) return
  isRetrying.value = true
  try {
    const res = await api.post(`/api/jds/${encodeURIComponent(analyzingId.value)}/retry`)
    if (res.ok) {
      analysisPhase.value = 'running'; isRetrying.value = false
      startDots(); startElapsed()
      progress.value = { status: 'running', steps: [], current: '正在启动AI引擎（重试）…' }
      const check = async () => {
        try {
          const r = await api.get(`/api/jds/${encodeURIComponent(analyzingId.value)}/progress`)
          if (r) progress.value = r
          if (r.status === 'done') {
            stopPolling(); stopDots(); store.clearAnalysisState()
            await store.fetchList()
            analysisDoneId.value = analyzingId.value; analysisDoneTitle.value = analyzingTitle.value
            analysisDone.value = true; analyzingId.value = null; isRetrying.value = false
          } else if (r.status === 'error' || r.status === 'timeout' || r.status === 'cancelled') {
            stopPolling(); stopDots(); store.clearAnalysisState()
            analysisPhase.value = r.status; isRetrying.value = false
          }
        } catch {}
      }
      check()
      pollTimer = setInterval(check, 2000)
      progressTimer = setInterval(async () => {
        try { const lr = await api.get(`/api/jds/${encodeURIComponent(analyzingId.value)}/log`); if (lr?.text) logText.value = lr.text } catch {}
      }, 2000)
      setTimeout(() => {
        if (analysisPhase.value === 'running') {
          stopPolling(); stopDots(); store.clearAnalysisState()
          analysisPhase.value = 'timeout'; isRetrying.value = false
        }
      }, 360000)
    } else {
      isRetrying.value = false
      progress.value = { ...progress.value, current: '重试失败: ' + (res.error || '未知错误') }
    }
  } catch (e) { isRetrying.value = false; progress.value = { ...progress.value, current: '重试请求失败: ' + e.message } }
}

function resetAnalysis() {
  stopPolling(); stopDots(); store.clearAnalysisState()
  analysisDone.value = false; analysisDoneId.value = null; analysisPhase.value = ''
  analyzingId.value = null; form.title = ''; form.rawText = ''; formError.value = ''
}

function handleDelete(id) {
  store.remove(id)
}

onMounted(async () => {
  store.fetchList()

  // 从详情页跳转过来的分析请求
  const analyzeId = route.query.analyze
  if (analyzeId) {
    showForm.value = true
    router.replace({ query: {} }) // 清除 query 参数
    setTimeout(() => handleAnalyzeExisting(analyzeId), 300) // 等列表加载完
  }

  // 恢复持久化的分析等待状态
  const saved = await store.getAnalysisState()
  if (saved && saved.status === 'waiting') {
    try {
      const jd = await store.fetchOne(saved.jdId)
      if (jd && jd.parsed) { store.clearAnalysisState(); return }
    } catch {}
    analyzingId.value = saved.jdId
    analyzingTitle.value = saved.title || ''
    showForm.value = true
    analysisPhase.value = 'running'
    startDots(); startElapsed()
    // 轮询进度
    const check = async () => {
      try {
        const res = await api.get('/api/jds/' + encodeURIComponent(saved.jdId) + '/progress')
        if (res) progress.value = res
        if (res.status === 'done') {
          stopPolling(); stopDots(); store.clearAnalysisState()
          store.fetchList(); analysisDoneId.value = saved.jdId; analysisDoneTitle.value = saved.title
          analysisDone.value = true; analyzingId.value = null
        } else if (res.status === 'error') {
          stopPolling(); stopDots(); store.clearAnalysisState()
          analysisPhase.value = 'error'
        } else if (res.status === 'timeout') {
          stopPolling(); stopDots(); store.clearAnalysisState()
          analysisPhase.value = 'timeout'
        } else if (res.status === 'cancelled') {
          stopPolling(); stopDots(); store.clearAnalysisState()
          analysisPhase.value = 'cancelled'
        }
      } catch {}
    }
    check()
    pollTimer = setInterval(check, 2000)
    progressTimer = setInterval(async () => {
      try { const res = await api.get('/api/jds/' + encodeURIComponent(saved.jdId) + '/log'); if (res?.text) logText.value = res.text } catch {}
    }, 2000)
    setTimeout(() => {
      if (analysisPhase.value === 'running') {
        stopPolling(); stopDots(); store.clearAnalysisState()
        analysisPhase.value = 'timeout'
      }
    }, 360000)
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

/* 调试面板 */
.debug-panel { max-width: 560px; margin: var(--space-md) auto 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.debug-header { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) var(--space-md); background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.debug-title { font-size: var(--text-xs); font-weight: 600; color: var(--color-text); }
.tab-badge { font-size: 0.6rem; color: var(--color-text-muted); font-family: monospace; }
.debug-body { max-height: 460px; overflow-y: auto; }
.debug-code { margin: 0; padding: var(--space-md); font-size: 0.62rem; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; line-height: 1.55; white-space: pre-wrap; word-break: break-all; background: #1a1a2e; color: #a0d0ff; }
.debug-btn-copy { font-size: var(--text-xs); color: var(--color-text-muted); background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 2px 10px; cursor: pointer; transition: all 0.15s; font-family: var(--font-body); margin-left: auto; }
.debug-btn-copy:hover { color: var(--blue); border-color: var(--blue); }
.debug-copied { font-size: var(--text-xs); color: var(--color-success); }

/* 耗时显示 */
.analyzing-elapsed {
  margin-top: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: monospace;
}

/* 操作按钮行 */
.analyzing-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.btn-verify {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.15s;
}
.btn-verify:hover { color: var(--blue); border-color: var(--blue); }

/* 结果状态：error / timeout / cancelled */
.result-state { text-align: center; padding: var(--space-lg) 0; }
.result-icon { font-size: 2.5rem; line-height: 1; margin-bottom: var(--space-md); }
.result-error .result-icon { color: var(--color-danger); }
.result-error .result-title { color: var(--color-danger); }
.result-timeout .result-icon { color: #f59e0b; }
.result-timeout .result-title { color: #f59e0b; }
.result-cancelled .result-icon { color: var(--color-text-muted); }
.result-cancelled .result-title { color: var(--color-text-muted); }
.result-title { font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-xs); }
.result-desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-lg); }
.result-actions { display: flex; align-items: center; justify-content: center; gap: var(--space-md); flex-wrap: wrap; }

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
