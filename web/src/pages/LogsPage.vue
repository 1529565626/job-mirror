<!-- LogsPage.vue — 会话日志归档浏览 -->
<template>
  <div class="logs-page">
    <div class="page-header">
      <h1 class="page-title">执行日志</h1>
      <span class="page-desc">每次 AI 分析的完整交互记录（prompt → response → timeline）</span>
    </div>

    <!-- 加载态 -->
    <LoadingSpinner v-if="loading" text="加载会话列表中..." />

    <!-- 错误态 -->
    <ErrorState v-else-if="error" :message="error" @retry="fetchSessions" />

    <!-- 空态 -->
    <EmptyState
      v-else-if="sessions.length === 0"
      icon="log"
      title="暂无会话记录"
      description="执行 JD 分析或简历导入后，记录会出现在这里"
    />

    <!-- 会话列表 + 详情 -->
    <template v-else>
      <div class="logs-layout">
        <!-- 左侧：会话列表 -->
        <aside class="session-list">
          <div
            v-for="s in sessions"
            :key="s.sessionId"
            class="session-item"
            :class="{ active: selectedId === s.sessionId }"
            @click="selectSession(s)"
          >
            <div class="session-meta">
              <span class="session-type" :class="s.type === 'JD分析' ? 'type-jd' : 'type-inbox'">
                {{ s.type }}
              </span>
              <span class="session-status" :class="statusClass(s.status)">
                {{ statusIcon(s.status) }}
              </span>
            </div>
            <div class="session-id">{{ s.metadata?.jdId || s.sessionId }}</div>
            <div class="session-time">{{ fmtTime(s.startedAt) }}</div>
            <div v-if="s.steps?.length" class="session-steps">{{ s.steps.length }} 步骤</div>
          </div>
        </aside>

        <!-- 右侧：会话详情 -->
        <section class="session-detail" v-if="detail">
          <div class="detail-header">
            <h2>
              {{ detail.metadata?.jdId || detail.sessionId }}
              <span v-if="detail.status === 'running'" class="running-badge"><span class="pulse-dot"></span>运行中</span>
            </h2>
            <span class="detail-type">{{ detail.type }}</span>
            <span class="detail-status" :class="detail.status === 'done' ? 'status-ok' : detail.status === 'running' ? 'status-running' : 'status-err'">
              {{ detail.status === 'done' ? '完成' : detail.status === 'running' ? '执行中…' : '异常' }}
              <template v-if="detail.exitCode !== undefined"> (exit={{ detail.exitCode }})</template>
            </span>
            <span class="detail-time">{{ fmtTime(detail.startedAt) }} → {{ detail.finishedAt ? fmtTime(detail.finishedAt) : '进行中' }}</span>
            <div class="detail-actions-bar">
              <button class="action-btn action-verify" @click="verifySession">校验状态</button>
              <button v-if="detail.status === 'running'" class="action-btn action-cancel" @click="cancelSession">取消</button>
              <span v-if="actionMsg" class="action-msg">{{ actionMsg }}</span>
            </div>
          </div>

          <!-- 步骤时间线 -->
          <div v-if="detail.timeline?.length" class="detail-section">
            <h3>⏱ 步骤时间线</h3>
            <div class="timeline">
              <div v-for="(s, i) in detail.timeline" :key="i" class="timeline-item">
                <span class="tl-idx">{{ i + 1 }}</span>
                <span class="tl-text">{{ s.text }}</span>
                <span class="tl-time">{{ fmtTime(s.time) }}</span>
              </div>
            </div>
          </div>

          <!-- 完整执行日志（response.txt 已包含 [1] 提示词 + [2] 返回结果） -->
          <div class="detail-section">
            <div class="view-header">
              <span class="view-header-title">📋 完整执行日志</span>
              <button class="btn-copy" @click="copyFullLog">复制全部</button>
              <span v-if="copied" class="copy-ok">已复制 ✓</span>
            </div>
            <div class="view-body">
              <pre class="view-code response-bg">{{ detail.response || (detail.status === 'running' ? '(等待AI输出…)' : '(无输出 — AI引擎未返回结果)') }}</pre>
            </div>
          </div>
        </section>

        <!-- 未选择 -->
        <div v-else class="session-detail session-empty">
          <p>← 选择左侧会话查看详情</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { api } from '@/services/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const loading = ref(true)
const error = ref(null)
const sessions = ref([])
const selectedId = ref(null)
const detail = ref(null)
const copied = ref(false)
const actionMsg = ref('')
let pollTimer = null
let listPollTimer = null
let actionMsgTimer = null

function statusClass(s) {
  if (s === 'done') return 'status-ok'
  if (s === 'running') return 'status-running'
  if (s === 'timeout') return 'status-timeout'
  if (s === 'cancelled') return 'status-cancelled'
  return 'status-err'
}
function statusIcon(s) {
  if (s === 'done') return '✓'
  if (s === 'running') return '◉'
  if (s === 'timeout') return '⏱'
  if (s === 'cancelled') return '⊘'
  return '✗'
}

function fmtTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function fetchSessions() {
  try { sessions.value = await api.get('/api/log/sessions') || [] } catch (e) { if (!loading.value) return; error.value = e.message }
  finally { loading.value = false }
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function selectSession(s) {
  stopPolling()
  selectedId.value = s.sessionId
  detail.value = null

  async function load() {
    try { detail.value = await api.get('/api/log/sessions/' + encodeURIComponent(s.sessionId)) } catch (e) { detail.value = { error: e.message } }
    // 如果会话仍在运行，持续轮询
    if (detail.value?.status === 'running') {
      if (!pollTimer) pollTimer = setInterval(load, 1500)
    } else {
      stopPolling()
    }
  }
  await load()
  // 同步更新列表中的状态
  const idx = sessions.value.findIndex(x => x.sessionId === s.sessionId)
  if (idx >= 0 && detail.value) {
    sessions.value[idx] = { ...sessions.value[idx], status: detail.value.status, steps: detail.value.steps }
  }
}

async function copyFullLog() {
  try { await navigator.clipboard.writeText(detail.value?.response || ''); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch {}
}

function flashMsg(msg) {
  actionMsg.value = msg
  if (actionMsgTimer) clearTimeout(actionMsgTimer)
  actionMsgTimer = setTimeout(() => { actionMsg.value = '' }, 3000)
}

async function verifySession() {
  if (!detail.value?.metadata?.jdId) return
  actionMsg.value = '校验中…'
  try {
    const res = await api.post('/api/jds/' + encodeURIComponent(detail.value.metadata.jdId) + '/verify')
    if (res) {
      const issues = res.issues || []
      const errors = issues.filter(i => i.level === 'error')
      const warns = issues.filter(i => i.level === 'warn')
      const oks = issues.filter(i => i.level === 'ok')
      const summary = []
      if (oks.length) summary.push(`${oks.length}项正常`)
      if (warns.length) summary.push(`${warns.length}项警告`)
      if (errors.length) summary.push(`${errors.length}项错误`)
      flashMsg('校验: ' + (summary.length ? summary.join(', ') : '无异常') + (errors.length ? ' — ' + errors[0].msg : ''))
      fetchSessions()
      if (selectedId.value) {
        try { detail.value = await api.get('/api/log/sessions/' + encodeURIComponent(selectedId.value)) } catch {}
      }
    }
  } catch (e) { flashMsg('校验失败: ' + e.message) }
}

async function cancelSession() {
  if (!detail.value?.metadata?.jdId) return
  try {
    const res = await api.post('/api/jds/' + encodeURIComponent(detail.value.metadata.jdId) + '/cancel')
    if (res?.ok) {
      flashMsg('已取消')
      fetchSessions()
      if (selectedId.value) {
        try { detail.value = await api.get('/api/log/sessions/' + encodeURIComponent(selectedId.value)) } catch {}
      }
    }
  } catch (e) { flashMsg('取消失败: ' + e.message) }
}

// 列表级别轮询（更新运行中会话的状态标记）
listPollTimer = setInterval(async () => {
  try {
    const fresh = await api.get('/api/log/sessions') || []
    for (const f of fresh) {
      const idx = sessions.value.findIndex(x => x.sessionId === f.sessionId)
      if (idx >= 0) sessions.value[idx] = f
    }
  } catch {}
}, 5000)

onUnmounted(() => {
  stopPolling()
  if (listPollTimer) { clearInterval(listPollTimer); listPollTimer = null }
})

fetchSessions()
</script>

<style scoped>
.logs-page { width: 100%; }
.page-header { margin-bottom: var(--space-lg); }
.page-title { font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-xs); }
.page-desc { font-size: var(--text-sm); color: var(--color-text-muted); }

/* 左右布局 */
.logs-layout { display: flex; gap: var(--space-lg); align-items: flex-start; }
.session-list { width: 240px; flex-shrink: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); max-height: 72vh; overflow-y: auto; }
.session-item { padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.12s; }
.session-item:hover { background: var(--color-primary-bg); }
.session-item.active { background: var(--color-primary-bg); border-left: 3px solid var(--blue); }
.session-meta { display: flex; align-items: center; gap: var(--space-xs); margin-bottom: 2px; }
.session-type { font-size: 0.65rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; }
.type-jd { background: rgba(43,127,216,0.12); color: var(--blue); }
.type-inbox { background: rgba(16,185,129,0.12); color: var(--color-success); }
.session-status { font-size: 0.6rem; }
.status-ok { color: var(--color-success); }
.status-running { color: var(--blue); }
.status-timeout { color: #f59e0b; }
.status-cancelled { color: var(--color-text-muted); }
.status-err { color: var(--color-danger); }
.running-badge { font-size: 0.65rem; font-weight: 500; color: var(--blue); display: inline-flex; align-items: center; gap: 4px; margin-left: var(--space-sm); vertical-align: middle; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); display: inline-block; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

/* 详情操作按钮 */
.detail-actions-bar { display: flex; align-items: center; gap: var(--space-sm); margin-top: var(--space-sm); }
.action-btn { font-size: var(--text-xs); background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 2px 10px; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
.action-verify { color: var(--color-text-muted); }
.action-verify:hover { color: var(--blue); border-color: var(--blue); }
.action-cancel { color: var(--color-danger); border-color: var(--color-danger); }
.action-cancel:hover { background: var(--color-danger); color: #fff; }
.action-msg { font-size: var(--text-xs); color: var(--color-text-muted); }
.session-id { font-size: var(--text-xs); font-weight: 500; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-time { font-size: 0.6rem; color: var(--color-text-muted); }
.session-steps { font-size: 0.6rem; color: var(--color-text-muted); }

/* 详情区 */
.session-detail { flex: 1; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-lg); }
.session-empty { display: flex; align-items: center; justify-content: center; min-height: 300px; color: var(--color-text-muted); font-size: var(--text-sm); }
.detail-header { margin-bottom: var(--space-lg); }
.detail-header h2 { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-xs); }
.detail-type { font-size: var(--text-xs); font-weight: 600; color: var(--blue); margin-right: var(--space-sm); }
.detail-status { font-size: var(--text-xs); }
.detail-time { font-size: 0.65rem; color: var(--color-text-muted); display: block; margin-top: 2px; }

.detail-section { margin-bottom: var(--space-lg); }
.detail-section h3 { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-sm); }

/* 步骤时间线 */
.timeline { display: flex; flex-direction: column; gap: 4px; }
.timeline-item { display: flex; align-items: baseline; gap: var(--space-sm); font-size: var(--text-xs); padding: 3px 0; }
.tl-idx { width: 18px; height: 18px; border-radius: 50%; background: var(--color-primary-bg); color: var(--blue); font-size: 0.6rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-text { flex: 1; color: var(--color-text-secondary); }
.tl-time { font-size: 0.6rem; color: var(--color-text-muted); white-space: nowrap; }

/* 单窗口日志 */
.view-header { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) var(--space-md); border-bottom: 1px solid var(--color-border); }
.view-header-title { font-size: var(--text-xs); font-weight: 600; color: var(--color-text); }
.view-body { max-height: 56vh; overflow-y: auto; }
.log-section { margin: 0; }
.log-section-label { font-size: 0.6rem; font-weight: 600; color: var(--color-text-muted); padding: var(--space-xs) var(--space-md); background: var(--color-surface); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 1; }
.view-code { margin: 0; padding: var(--space-md); font-size: 0.62rem; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; line-height: 1.55; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; }
.prompt-bg { background: #0d1117; color: #c9d1d9; }
.response-bg { background: #1a1a2e; color: #a0d0ff; }
.btn-copy { font-size: var(--text-xs); color: var(--color-text-muted); background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 2px 10px; cursor: pointer; transition: all 0.15s; font-family: var(--font-body); margin-left: auto; }
.btn-copy:hover { color: var(--blue); border-color: var(--blue); }
.copy-ok { font-size: var(--text-xs); color: var(--color-success); }
</style>
