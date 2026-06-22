<!-- ProfilePage.vue — 个人技能档案看板，含简历拖拽上传 + PDF/DOCX内嵌展示 -->
<template>
  <div class="profile-page">
    <h1 class="page-title">个人档案</h1>

    <!-- 加载态 -->
    <LoadingSpinner v-if="store.loading" text="加载档案中..." />

    <!-- 错误态 -->
    <ErrorState
      v-else-if="store.error"
      :message="store.error"
      @retry="store.fetch()"
    />

    <!-- 空态：拖拽上传简历 -->
    <div v-else-if="store.isEmpty" class="onboarding-section">
      <!-- 拖拽上传区 -->
      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': isDragging, 'drop-zone--extracting': isExtracting }"
        @dragenter.prevent="onDragEnter"
        @dragleave.prevent="onDragLeave"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
        @click="openFilePicker"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,.docx,.md,.txt"
          class="file-input-hidden"
          @change="onFileSelected"
        />

        <!-- 默认状态 -->
        <template v-if="!isExtracting && !uploadResult">
          <div class="drop-icon">&#8682;</div>
          <p class="drop-title">拖拽简历文件到此处</p>
          <p class="drop-hint">或点击选择文件</p>
          <p class="drop-formats">支持 PDF / DOCX / Markdown / TXT</p>
        </template>

        <!-- 提取中 -->
        <template v-else-if="isExtracting">
          <div class="spinner"></div>
          <p class="drop-title">正在提取文本...</p>
          <p class="drop-hint">{{ extractingFileName }}</p>
        </template>

        <!-- 提取成功 → AI 自动解析中 -->
        <template v-else-if="uploadResult === 'success' || uploadResult === 'processing'">
          <div class="spinner"></div>
          <p class="drop-title">{{ uploadResult === 'processing' ? 'AI 正在解析简历...' : '简历已就绪' }}</p>
          <p class="drop-desc" v-if="uploadResult === 'processing'">正在自动提取技能、经历、教育背景…</p>
          <p class="drop-desc" v-else>正在连接 AI 服务…</p>
          <p class="drop-hint">
            <span class="pulse-dot"></span>
            请稍候{{ '.'.repeat(waitingDots) }}
          </p>
        </template>

        <!-- 提取失败 -->
        <template v-else-if="uploadResult === 'error'">
          <div class="drop-icon drop-icon--error">&#10007;</div>
          <p class="drop-title">提取失败</p>
          <p class="drop-desc">{{ uploadError }}</p>
          <button class="btn btn-primary" @click.stop="resetUpload">重新上传</button>
        </template>
      </div>

      <!-- 下方引导 -->
      <div class="onboarding-hint">
        <EmptyState
          icon="user"
          title="还没有档案"
          description="上传简历后，在 Claude Code 中说「用职镜导入收件箱」即可自动解析并生成技能档案"
        />
      </div>
    </div>

    <!-- 正常数据 -->
    <div v-else class="profile-content">
      <!-- 工具栏 -->
      <div class="profile-toolbar">
        <button class="btn-tool" @click="triggerUpdate">
          更新内容
        </button>
        <button class="btn-tool btn-tool--danger" @click="showClearConfirm = true">
          清空档案
        </button>
        <button class="btn-tool btn-tool--source" @click="openSource">
          查看源文件
        </button>
      </div>

      <!-- 更新引导提示 -->
      <div v-if="showUpdateHint" class="update-hint">
        <div class="update-hint__content">
          <span class="update-hint__icon">&#9432;</span>
          <span>在终端执行 <code>用职镜导入收件箱</code>，完成后<a href="javascript:void(0)" @click="refreshProfile">刷新档案</a></span>
        </div>
        <button class="update-hint__close" @click="showUpdateHint = false">&#10005;</button>
      </div>

      <BasicInfo :basic="store.data.basic" />
      <SkillList :skills="store.data.skills" />
      <ExperienceList :experiences="store.data.experiences" @polish="onPolishRequest" />
      <ProjectList :projects="store.data.projects || []" @polish="onPolishRequest" />
      <EducationList :education="store.data.education" />
    </div>

    <!-- 清空确认弹窗 -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="confirm-overlay" @click.self="showClearConfirm = false">
        <div class="confirm-card">
          <p class="confirm-title">确认清空档案？</p>
          <p class="confirm-desc">将删除个人档案、收件箱简历、已保存的岗位、分析报告和润色记录。此操作不可撤销。</p>
          <div class="confirm-actions">
            <button class="btn btn-cancel" @click="showClearConfirm = false">取消</button>
            <button class="btn btn-danger" :disabled="clearing" @click="doClear">
              {{ clearing ? '清空中...' : '确认清空' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 源文件弹窗 -->
    <Teleport to="body">
      <div v-if="showSource" class="source-overlay" @click.self="closeSource">
        <div class="source-modal" :class="{ 'source-modal--wide': sourceFileType === 'pdf' || sourceFileType === 'docx' }">
          <div class="source-header">
            <h2 class="source-header-title">{{ sourceFileName || '原始简历' }}</h2>
            <span v-if="sourceFileType === 'txt' || sourceFileType === 'md'" class="source-meta">共 {{ sourceCharCount }} 字符</span>
            <span v-else class="source-meta">{{ sourceFileType?.toUpperCase() }}</span>
            <button class="source-close" @click="closeSource">&#10005;</button>
          </div>
          <div class="source-body">

            <!-- PDF: canvas 逐页渲染 -->
            <div v-if="sourceFileType === 'pdf'" class="source-pdf-viewer">
              <div v-if="pdfLoading" class="source-loading">
                <div class="spinner"></div>
                <p>渲染 PDF 中...</p>
              </div>
              <div v-for="pageNum in pdfPageCount" :key="pageNum" class="pdf-page-wrapper">
                <canvas :ref="el => setPdfCanvas(pageNum, el)" class="pdf-canvas"></canvas>
                <span class="pdf-page-num">{{ pageNum }} / {{ pdfPageCount }}</span>
              </div>
            </div>

            <!-- DOCX: mammoth 转 HTML 渲染 -->
            <div v-else-if="sourceFileType === 'docx'" class="source-docx-viewer">
              <div v-if="docxLoading" class="source-loading">
                <div class="spinner"></div>
                <p>渲染 DOCX 中...</p>
              </div>
              <div v-else class="docx-content" v-html="docxHtml"></div>
            </div>

            <!-- TXT / MD: 纯文本展示 -->
            <pre v-else-if="sourceText" class="source-text">{{ sourceText }}</pre>

            <!-- 加载中 -->
            <div v-else class="source-loading">
              <div class="spinner"></div>
              <p>加载中...</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- AI 润色对比弹窗 -->
    <PolishModal
      :visible="polishVisible"
      :item-type="polishItem.type"
      :item-label="polishItem.label"
      :original-text="polishItem.text"
      :context="polishItem.context"
      @update:visible="polishVisible = $event"
      @accept="onPolishAccept"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { useProfileStore } from '@/stores/profile'
import { extractWithBinary } from '@/utils/fileExtractor'
import { api } from '@/services/api'
import BasicInfo from '@/components/profile/BasicInfo.vue'
import SkillList from '@/components/profile/SkillList.vue'
import ExperienceList from '@/components/profile/ExperienceList.vue'
import ProjectList from '@/components/profile/ProjectList.vue'
import EducationList from '@/components/profile/EducationList.vue'
import PolishModal from '@/components/report/PolishModal.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const store = useProfileStore()

// --- AI 润色 ---
const polishVisible = ref(false)
const polishItem = ref({ type: '', label: '', text: '', context: {}, index: -1 })

function onPolishRequest(e) {
  polishItem.value = {
    type: e.type,
    label: e.label,
    text: e.text,
    context: e.context,
    index: e.index
  }
  polishVisible.value = true
}

async function onPolishAccept(result) {
  // 直接更新 profile 数据中的对应描述
  const data = { ...store.data }
  if (result.itemType === 'project') {
    const idx = polishItem.value.index
    if (idx >= 0 && data.projects?.[idx]) {
      data.projects[idx] = { ...data.projects[idx], description: result.polishedText }
    }
  } else if (result.itemType === 'experience') {
    const idx = polishItem.value.index
    if (idx >= 0 && data.experiences?.[idx]) {
      data.experiences[idx] = { ...data.experiences[idx], description: result.polishedText }
    }
  }
  // 保存到服务器
  await api.put('/api/profile', data)
  // 刷新本地数据
  await store.fetch()
}

// 上传相关状态
const fileInputRef = ref(null)
const isDragging = ref(false)
const isExtracting = ref(false)
const extractingFileName = ref('')
const uploadResult = ref(null)
const uploadError = ref('')

let dragCounter = 0

function onDragEnter() {
  dragCounter++
  isDragging.value = true
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragging.value = false
  }
}

function onDragOver() {
  isDragging.value = true
}

async function onDrop(e) {
  isDragging.value = false
  dragCounter = 0
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    await handleFile(files[0])
  }
}

function openFilePicker() {
  if (isExtracting.value) return
  fileInputRef.value?.click()
}

async function onFileSelected(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    await handleFile(files[0])
  }
  e.target.value = ''
}

async function handleFile(file) {
  uploadResult.value = null
  uploadError.value = ''
  isExtracting.value = true
  extractingFileName.value = file.name

  try {
    const { text, base64, fileType } = await extractWithBinary(file)
    const ok = await store.saveResume(text)
    if (!ok) throw new Error(store.error || '保存失败')

    await store.saveResumeFile(base64, file.name, fileType)
    isExtracting.value = false

    // 自动调用 AI 解析
    uploadResult.value = 'processing'
    startDots()

    try {
      const result = await api.post('/api/inbox/process')
      if (result.ok) {
        stopDots()
        await store.fetch()
        if (!store.isEmpty) {
          uploadResult.value = null
          return
        }
      }
      throw new Error(result.error || '解析未完成')
    } catch (processErr) {
      // AI 自动解析失败 → 降级为手动模式
      stopDots()
      uploadResult.value = 'success'
      startPolling()
    }
  } catch (e) {
    isExtracting.value = false
    uploadResult.value = 'error'
    uploadError.value = e.message
  }
}

function resetUpload() {
  uploadResult.value = null
  uploadError.value = ''
}

// === 轮询收件箱状态 ===
const pollTimer = ref(null)
const waitingDots = ref(0)
let dotsTimer = null

function startPolling() {
  uploadResult.value = 'success'
  showUpdateHint.value = false
  store.saveImportState({ status: 'waiting', startedAt: new Date().toISOString() })
  startDots()

  const check = async () => {
    const status = await store.checkInboxStatus()
    if (status.processed) {
      stopPolling()
      await store.clearImportState()
      await store.fetch()
      if (!store.isEmpty) {
        uploadResult.value = null
      }
    }
  }

  check()
  pollTimer.value = setInterval(check, 3000)
}

function startDots() {
  dotsTimer = setInterval(() => {
    waitingDots.value = (waitingDots.value % 3) + 1
  }, 600)
}

function stopDots() {
  if (dotsTimer) {
    clearInterval(dotsTimer)
    dotsTimer = null
  }
  waitingDots.value = 0
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
  stopDots()
}

// 更新内容引导
const showUpdateHint = ref(false)

function triggerUpdate() {
  showUpdateHint.value = true
  startPolling()
}

function refreshProfile() {
  store.fetch()
  showUpdateHint.value = false
  stopPolling()
  store.clearImportState()
  uploadResult.value = null
}

// 清空档案
const showClearConfirm = ref(false)
const clearing = ref(false)

async function doClear() {
  clearing.value = true
  await store.clearAll()
  clearing.value = false
  showClearConfirm.value = false
}

function copyCommand() {
  navigator.clipboard.writeText('用职镜导入收件箱').then(() => {
    const btn = document.querySelector('.btn-copy')
    if (btn) {
      btn.textContent = '已复制'
      setTimeout(() => { btn.textContent = '复制' }, 1500)
    }
  }).catch(() => {})
}

// === 源文件弹窗 ===
const showSource = ref(false)
const sourceText = ref('')
const sourceCharCount = ref(0)
const sourceFileName = ref('')
const sourceFileType = ref('')

// PDF 渲染
const pdfLoading = ref(false)
const pdfPageCount = ref(0)
const pdfCanvasRefs = {}

function setPdfCanvas(pageNum, el) {
  if (el) pdfCanvasRefs[pageNum] = el
}

// DOCX 渲染
const docxLoading = ref(false)
const docxHtml = ref('')

async function openSource() {
  showSource.value = true
  sourceText.value = ''
  sourceFileName.value = ''
  sourceFileType.value = ''
  docxHtml.value = ''

  // 先尝试获取原始文件
  const fileData = await store.fetchResumeFile()
  if (fileData && fileData.data) {
    sourceFileName.value = fileData.fileName
    sourceFileType.value = fileData.fileType

    if (fileData.fileType === 'pdf') {
      await renderPDF(fileData.data)
    } else if (fileData.fileType === 'docx') {
      await renderDOCX(fileData.data)
    } else {
      // MD / TXT: 从文本接口读取
      const txt = await store.fetchResumeText()
      sourceText.value = txt?.rawText || '暂无源文件。'
      sourceCharCount.value = txt?.size || sourceText.value.length
    }
  } else {
    // 降级：尝试读取纯文本
    const result = await store.fetchResumeText()
    if (result && result.rawText) {
      sourceText.value = result.rawText
      sourceCharCount.value = result.size || result.rawText.length
      sourceFileType.value = 'txt'
    } else {
      sourceText.value = '暂无源文件。请先上传简历。'
      sourceCharCount.value = 0
    }
  }
}

async function renderPDF(base64) {
  pdfLoading.value = true
  pdfPageCount.value = 0
  try {
    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const pdf = await pdfjsLib.getDocument({ data: binary }).promise
    pdfPageCount.value = pdf.numPages

    await nextTick()
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const canvas = pdfCanvasRefs[i]
      if (!canvas) continue
      const viewport = page.getViewport({ scale: 1.5 })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
    }
  } catch (e) {
    sourceText.value = 'PDF 渲染失败: ' + e.message
    sourceFileType.value = 'txt'
  } finally {
    pdfLoading.value = false
  }
}

async function renderDOCX(base64) {
  docxLoading.value = true
  try {
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
    docxHtml.value = result.value
  } catch (e) {
    sourceText.value = 'DOCX 渲染失败: ' + e.message
    sourceFileType.value = 'txt'
  } finally {
    docxLoading.value = false
  }
}

function closeSource() {
  showSource.value = false
  pdfPageCount.value = 0
  for (const key in pdfCanvasRefs) delete pdfCanvasRefs[key]
}

onMounted(async () => {
  store.fetch()

  // 恢复持久化的导入等待状态（页面刷新后不丢失）
  const saved = await store.getImportState()
  if (saved && saved.status === 'waiting' && store.isEmpty) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.profile-page {
  width: 100%;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* === 工具栏 === */
.profile-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
}

.btn-tool:hover {
  color: var(--blue);
  border-color: var(--blue);
  background: var(--color-primary-bg);
}

.btn-tool--source {
  color: var(--blue);
  background: var(--color-primary-bg);
  border-color: transparent;
}

.btn-tool--source:hover {
  border-color: var(--blue);
}

.btn-tool--danger {
  color: var(--color-text-muted);
}

.btn-tool--danger:hover {
  color: var(--red);
  border-color: var(--red);
  background: var(--color-danger-bg);
}

/* === 更新引导 === */
.update-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: var(--color-primary-bg);
  border: 1px solid rgba(43, 127, 216, 0.2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.update-hint__content {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.update-hint__icon {
  color: var(--blue);
  font-size: 1.1rem;
}

.update-hint code {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: rgba(43, 127, 216, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--blue);
}

.update-hint a {
  color: var(--blue);
  font-weight: 500;
}

.update-hint__close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  background: transparent;
  transition: all 0.15s;
}

.update-hint__close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

/* === 确认弹窗 === */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 400px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.confirm-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--space-sm);
}

.confirm-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-lg);
}

.confirm-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.btn-cancel {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  border-color: var(--color-text-muted);
}

.btn-danger {
  background: var(--red);
  color: #fff;
  border: none;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-danger:hover {
  background: #d13a4f;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* === 源文件弹窗 === */
.source-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.source-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: min(720px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.source-modal--wide {
  width: min(900px, 95vw);
}

.source-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.source-header-title {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.source-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  background: transparent;
  flex-shrink: 0;
}

.source-close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.source-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

/* PDF viewer */
.source-pdf-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.pdf-page-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.pdf-canvas {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
}

.pdf-page-num {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* DOCX viewer */
.source-docx-viewer {
  min-height: 200px;
}

.docx-content {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text);
}

.docx-content :deep(h1),
.docx-content :deep(h2),
.docx-content :deep(h3) {
  font-family: var(--font-heading);
  color: var(--color-text);
  margin: 1em 0 0.5em;
}

.docx-content :deep(p) {
  margin: 0.5em 0;
}

.docx-content :deep(ul),
.docx-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.docx-content :deep(li) {
  margin-bottom: 0.3em;
}

/* 纯文本 */
.source-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.source-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  color: var(--color-text-muted);
}

/* === 上传区 === */
.onboarding-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  position: relative;
}

.drop-zone:hover {
  border-color: var(--blue);
  background: var(--color-primary-bg);
}

.drop-zone--active {
  border-color: var(--blue);
  background: var(--color-primary-bg);
  border-style: solid;
}

.drop-zone--extracting {
  cursor: default;
  border-color: var(--color-border);
  background: var(--color-bg);
}

.file-input-hidden {
  display: none;
}

.drop-icon {
  font-size: 2.5rem;
  color: var(--color-text-muted);
  line-height: 1;
  margin-bottom: var(--space-md);
}

.drop-icon--success {
  color: var(--color-success);
}

.drop-icon--error {
  color: var(--color-danger);
}

.drop-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.drop-hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.drop-formats {
  margin-top: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.drop-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--space-sm) 0;
}

/* 终端命令展示 */
.terminal-cmd {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-text);
  color: #fff;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin: var(--space-sm) 0;
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
  transition: background 0.15s;
  border: none;
}

.btn-copy:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* spinner（局部） */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 下方提示 */
.onboarding-hint {
  opacity: 0.6;
}

/* === 等待解析脉冲点 === */
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

/* spinner（局部） */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
