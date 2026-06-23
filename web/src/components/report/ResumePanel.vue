<!-- ResumePanel.vue — 右侧简历面板：MD编辑 / 即时预览 / 导出
     三层分离：数据层(profile store) → 设计层(CSS变量) → 渲染层(Vue组件) -->
<template>
  <aside class="resume-panel">
    <!-- 编辑器 -->
    <div class="panel-scroll">
      <div class="panel-body">
        <textarea
          v-model="resumeText"
          class="resume-editor"
          placeholder="暂无简历内容"
          spellcheck="false"
        ></textarea>
      </div>

      <div v-if="changes.length > 0" class="changes-section">
        <h4 class="changes-title">修改记录 ({{ changes.length }})</h4>
        <ul class="changes-list">
          <li v-for="(ch, i) in changes" :key="ch.id" class="change-item">
            <span class="change-label">{{ ch.section }}</span>
            <span class="change-summary">{{ ch.summary }}</span>
            <button v-if="i === changes.length - 1" class="btn-undo" @click="undoLast">撤销</button>
          </li>
        </ul>
      </div>

    </div>

    <!-- 底部：配置（向上展开）+ 操作栏 -->
    <ResumeConfig
      :projects="projects"
      :jdKeywords="jdKeywords"
      :config="config"
      @update:config="updateConfig"
    />
    <div class="panel-actions">
      <!-- 模板选择 -->
      <div class="template-picker">
        <button
          v-for="tpl in templates"
          :key="tpl.key"
          class="tpl-btn"
          :class="{ active: (config.templateName || 'professional') === tpl.key }"
          @click="updateConfig({ templateName: tpl.key })"
        >{{ tpl.label }}</button>
      </div>

      <button class="btn btn-primary btn-full" @click="openPreview" :disabled="!hasProfile">
        在新标签页打开预览
      </button>

      <div class="export-area">
        <div class="export-btns">
          <button class="btn-export" @click="exportFormat('html')">下载 HTML</button>
          <button class="btn-export" @click="exportFormat('md')">下载 MD</button>
          <button class="btn-export" @click="exportFormat('pdf')">导出 PDF</button>
        </div>
      </div>
    </div>
  </aside>

  <!-- 隐藏渲染容器：供导出时提取 HTML（内容与预览窗口一致） -->
  <div v-show="false" ref="renderRef">
    <ResumeTemplate
      v-if="hasProfile"
      :profile="profile"
      :config="resumeConfig"
      :jd-keywords="jdKeywords"
      :template-name="resumeConfig.templateName"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { api } from '@/services/api'
import ResumeConfig from './ResumeConfig.vue'
import ResumeTemplate from '@/components/resume/ResumeTemplate.vue'
import '@/components/resume/resume-theme.css'

const props = defineProps({
  reportId: { type: String, required: true },
  profile: { type: Object, default: () => ({}) },
  suggestions: { type: Array, default: () => [] },
  initialText: { type: String, default: '' },
  savedChanges: { type: Array, default: () => [] },
  savedConfig: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['save-changes', 'update-config', 'changes-updated'])

const resumeText = ref(props.initialText)
const renderRef = ref(null)

const templates = [
  { key: 'professional', label: '专业型' },
  { key: 'modern', label: '现代型' },
  { key: 'minimal', label: '简洁型' }
]

const changes = ref([...props.savedChanges])
const config = ref({ projectCount: 'all', projectSort: 'relevance', templateName: 'professional', ...props.savedConfig })

const projects = computed(() => props.profile?.projects || [])
const jdKeywords = computed(() => [...new Set((props.suggestions || []).map(s => s.section))])

const hasProfile = computed(() => !!(props.profile && (props.profile.skills?.length || props.profile.experiences?.length || props.profile.projects?.length || props.profile.basic?.name)))

// 传给 ResumeTemplate 的配置
const resumeConfig = computed(() => ({
  projectSort: config.value.projectSort,
  projectCount: config.value.projectCount,
  templateName: config.value.templateName || 'professional'
}))

// --- 预览：从 Vue 组件渲染提取 HTML，即时打开新窗口 ---
function getRenderedHTML() {
  const tpl = config.value.templateName || 'professional'
  if (!renderRef.value) return buildResumePage(resumeText.value ? basicMDToHTML(resumeText.value) : '<p>暂无简历内容</p>', tpl)
  return buildResumePage(renderRef.value.innerHTML, tpl)
}

function buildResumePage(bodyHTML, tpl) {
  const themes = {
    professional: { bg:'#f2efe8', pageBg:'#fff', accent:'#F4D758', accent2:'#2B7FD8', text:'#1A1A2E', text2:'#4A4A5A', text3:'#8A8A9A', titleAlign:'center', sectionBorder:'2px solid #F4D758', summaryBg:'rgba(43,127,216,.04)', summaryBorder:'3px solid #2B7FD8', pageShadow:'0 4px 16px rgba(0,0,0,.06)', pageRadius:'4px', headingFont:'Noto Serif SC' },
    modern: { bg:'#e8ecf1', pageBg:'#fff', accent:'#2B7FD8', accent2:'#1a5fb4', text:'#1a1a2e', text2:'#4a5568', text3:'#718096', titleAlign:'left', sectionBorder:'1.5px solid #2B7FD8', summaryBg:'#f7fafc', summaryBorder:'3px solid #2B7FD8', pageShadow:'0 2px 12px rgba(0,0,0,.08)', pageRadius:'2px', headingFont:'Noto Sans SC' },
    minimal: { bg:'#fff', pageBg:'#fff', accent:'#333', accent2:'#555', text:'#222', text2:'#555', text3:'#888', titleAlign:'left', sectionBorder:'1px solid #e0e0e0', summaryBg:'transparent', summaryBorder:'1px solid #e0e0e0', pageShadow:'none', pageRadius:'0', headingFont:'Noto Sans SC' }
  }
  const t = themes[tpl] || themes.professional
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>简历预览 — ${props.reportId}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@600;700;900&display=swap" rel="stylesheet">
<style>
@page{margin:0;size:A4}
:root{--blue:#2B7FD8;--yellow:#F4D758;--red:#E84A5F;--cream:#fefcf6;--ink:#1A1A2E;--color-text:#1A1A2E;--color-text-secondary:#4A4A5A;--color-text-muted:#8A8A9A;--color-bg:#fefcf6;--color-surface:#ffffff;--color-border:rgba(26,26,26,.07);--font-heading:'Noto Serif SC',serif;--font-body:'Noto Sans SC',sans-serif;--text-xs:0.75rem;--text-sm:0.85rem;--text-base:1rem;--star-filled:#F4D758;--star-empty:#e0dcd0;--resume-page-width:780px;--resume-page-padding:3rem;--resume-section-gap:1.6rem;--resume-item-gap:1rem;--resume-tag-gap:6px;--resume-name-size:1.6rem;--resume-section-title-size:1.1rem;--resume-item-title-size:1rem}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans SC',-apple-system,'PingFang SC',sans-serif;font-size:15px;line-height:1.7;color:${t.text};background:${t.bg};padding:12mm 15mm}
::selection{background:${t.accent};color:#fff}
.resume-page{max-width:780px;margin:2rem auto;background:${t.pageBg};border-radius:${t.pageRadius};box-shadow:${t.pageShadow};padding:3rem;font-family:'Noto Sans SC',sans-serif;font-size:1rem;line-height:1.7;color:${t.text}}
.resume-name{font-family:'${t.headingFont}',serif;font-size:1.8rem;font-weight:900;color:${t.text};margin:0 0 .15rem;text-align:${t.titleAlign};letter-spacing:.02em}
.resume-subtitle{font-size:.85rem;color:${t.text2};margin:0;text-align:${t.titleAlign}}
.resume-meta-row{font-size:.85rem;color:${t.text3};margin:.15rem 0 0;text-align:${t.titleAlign}}
.resume-section-title{font-family:'${t.headingFont}',serif;font-size:1.1rem;font-weight:700;color:${t.text};margin:1.5rem 0 .5rem;padding-bottom:.3rem;border-bottom:${t.sectionBorder};letter-spacing:.01em}
.resume-card{margin-bottom:1rem}
.resume-card-title{font-family:'${t.headingFont}',serif;font-size:1rem;font-weight:700;color:${t.text};margin-bottom:.15rem}
.resume-card-subtitle{font-size:.85rem;color:${t.text2};margin-bottom:.2rem}
.resume-card-meta{font-size:.75rem;color:${t.text3};margin-bottom:.3rem}
.resume-tags{display:flex;flex-wrap:wrap;gap:6px;margin:.35rem 0}
.resume-tag{display:inline-block;padding:2px 10px;font-size:.75rem;color:${t.accent2};background:${t.accent}20;border-radius:12px}
.resume-summary{margin:.6rem 0 0;padding:.6rem 1rem;background:${t.summaryBg};border-left:${t.summaryBorder};border-radius:0 8px 8px 0;font-size:.85rem;color:${t.text2};line-height:1.6}
.resume-highlights{padding-left:1.4em;margin:.3rem 0 0;list-style:disc}
.resume-highlights li{font-size:.85rem;color:${t.text2};margin-bottom:3px;line-height:1.6}
.skill-category{margin-bottom:.5rem}
.skill-category-name{font-size:.85rem;font-weight:700;color:${t.text};margin-bottom:.2rem}
.skill-items{display:flex;flex-wrap:wrap;gap:6px 14px}
.skill-item{font-size:.85rem;color:${t.text};display:inline-flex;align-items:center;gap:6px}
.skill-name{font-weight:500}
.skill-tag{font-size:.6rem;font-weight:600;padding:1px 6px;border-radius:8px}
.proficiency-expert,.proficiency-proficient{background:#27ae6020;color:#1f8b4c}
.proficiency-advanced{background:#2b7fd820;color:#1a6bc4}
.proficiency-intermediate{background:#f4d75830;color:#8b7a10}
.proficiency-novice{background:#e8e8e8;color:#888}
.skill-years{font-size:.7rem;color:${t.text3}}
.skill-note{display:block;font-size:.65rem;color:${t.text3};margin-top:2px;line-height:1.4}
/* 现代型侧栏布局 */
.resume-modern{display:flex;padding:0;max-width:820px;overflow:hidden}
.modern-sidebar{width:32%;background:#1a2332;color:#e0e6ed;padding:2.2rem 1.5rem;flex-shrink:0}
.modern-sidebar-name{font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:.2rem}
.modern-sidebar-role{font-size:.9rem;color:#8ab4f8;margin-bottom:.8rem}
.modern-sidebar-info{font-size:.75rem;color:#9aa9b7;margin-bottom:1.4rem;line-height:1.7}
.modern-section-title{font-size:.75rem;font-weight:700;color:#8ab4f8;text-transform:uppercase;letter-spacing:.08em;margin:1.2rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid rgba(255,255,255,.15)}
.modern-skill-group{margin-bottom:.6rem}
.modern-skill-cat{font-size:.65rem;color:#6a7d8e;margin-bottom:.15rem;text-transform:uppercase;letter-spacing:.05em}
.modern-skill-tags{display:flex;flex-wrap:wrap;gap:4px}
.modern-skill-tag{font-size:.7rem;color:#bcc8d4;background:rgba(255,255,255,.07);padding:2px 8px;border-radius:8px}
.modern-edu-item{margin-bottom:.4rem}
.modern-edu-school{font-size:.8rem;color:#d0d8e0;font-weight:600}
.modern-edu-meta{font-size:.7rem;color:#8a9aa8}
.modern-main{flex:1;padding:2.2rem 2rem;background:#fff}
.modern-summary{font-size:.85rem;color:#4a5568;line-height:1.7;margin-bottom:1.4rem;padding-bottom:1rem;border-bottom:1px solid #e8ecf1}
.modern-card{margin-bottom:1rem}
.modern-card-header{display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap;margin-bottom:.2rem}
.modern-card-role{font-size:.95rem;font-weight:700;color:#1a1a2e}
.modern-card-company{font-size:.85rem;color:#2B7FD8}
.modern-card-date{font-size:.75rem;color:#888;margin-left:auto}
.modern-card-desc{font-size:.8rem;color:#555;margin-bottom:.3rem;line-height:1.6}
.modern-highlights{padding-left:1.3em;margin:.2rem 0 0;list-style:disc}
.modern-highlights li{font-size:.82rem;color:#4a5568;margin-bottom:2px;line-height:1.6}
.modern-tech-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:.35rem}
.modern-tech-tag{font-size:.65rem;color:#2B7FD8;background:rgba(43,127,216,.07);padding:1px 8px;border-radius:10px}
/* 简洁型 */
.resume-minimal{padding:3.5rem 3rem;box-shadow:none;border-radius:0;max-width:700px}
.minimal-header{margin-bottom:1.8rem}
.minimal-name{font-size:2rem;font-weight:300;color:#111;margin:0 0 .3rem;letter-spacing:.04em}
.minimal-meta{font-size:.8rem;color:#777}
.minimal-sep{margin:0 .6rem;color:#ccc}
.minimal-summary{font-size:.85rem;color:#555;line-height:1.8;margin-bottom:1.8rem}
.minimal-section-title{font-size:.75rem;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:.12em;margin:1.4rem 0 .5rem;padding-bottom:.25rem;border-bottom:1px solid #e0e0e0}
.minimal-card{margin-bottom:.8rem}
.minimal-card-row{font-size:.9rem;color:#333;margin-bottom:.15rem;display:flex;align-items:baseline;gap:.3rem;flex-wrap:wrap}
.minimal-dot{color:#ccc;margin:0 .15rem}
.minimal-date{font-size:.75rem;color:#aaa;margin-left:auto}
.minimal-hl{padding-left:1.2em;margin:.1rem 0 0;list-style:disc}
.minimal-hl li{font-size:.82rem;color:#555;margin-bottom:2px;line-height:1.6}
.minimal-skills{display:flex;flex-wrap:wrap;gap:4px 16px}
.minimal-skill-item{font-size:.85rem;color:#333}
.minimal-skill-yr{font-size:.7rem;color:#aaa}
.minimal-edu-line{font-size:.85rem;color:#555;margin-bottom:.15rem}
@media print{body{background:#fff}.resume-page{box-shadow:none;max-width:100%;margin:0;padding:1.5rem;border-radius:0}.resume-tag{background:none;border:1px solid #ddd}.resume-modern{display:flex}.modern-sidebar{background:#1a2332!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>${bodyHTML}</body>
</html>`
}

// MD→HTML 降级转换（profile 数据不可用时的后备方案）
function basicMDToHTML(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(?!<[a-z/!])(.+)$/gm, '<p>$1</p>')
    .replace(/<\/li>\n<li>/g, '</li><li>')
    .replace(/((?:<li>.*<\/li>)+)/g, '<ul>$1</ul>')
}

async function openPreview() {
  // 等待隐藏的 ResumeTemplate 渲染完成
  await nextTick()
  // 给浏览器一帧时间完成布局
  await new Promise(r => requestAnimationFrame(r))

  const html = getRenderedHTML()
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// --- 导出 ---
function exportFormat(format) {
  const name = sanitizeFilename(props.reportId)

  if (format === 'md') {
    downloadBlob(`${name}.md`, resumeText.value, 'text/markdown;charset=utf-8')
    return
  }

  const bodyHTML = renderRef.value?.innerHTML || basicMDToHTML(resumeText.value)
  const html = buildResumePage(bodyHTML, config.value.templateName || 'professional')

  if (format === 'html') {
    downloadBlob(`${name}.html`, html, 'text/html;charset=utf-8')
  } else if (format === 'pdf') {
    // 使用浏览器原生打印 → 另存为 PDF（自动分页、不截断）
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    // 等字体/图片加载完成后触发打印
    w.onload = () => setTimeout(() => w.print(), 600)
  }
}

function sanitizeFilename(name) {
  return (name || 'resume').replace(/[^a-zA-Z0-9一-鿿_-]/g, '_')
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob(['﻿' + content], { type: `${mime};charset=utf-8` })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// --- MD 生成（保持向后兼容：textarea 编辑器仍用 MD 格式）---
function buildFormattedMD() {
  const d = props.profile || {}
  const b = d.basic || {}
  const lines = []

  lines.push(`# ${b.name || ''}`)
  const subtitle = [b.currentRole, b.yearsOfExperience ? `${b.yearsOfExperience}年经验` : '', b.industry].filter(Boolean).join(' · ')
  if (subtitle) lines.push(`**${subtitle}**`)
  if (b.summary) lines.push(`\n> ${b.summary}`)

  if (b.name || b.industry || b.currentRole) {
    lines.push('\n## 基本信息')
    if (b.name) lines.push(`- 姓名：${b.name}`)
    if (b.currentRole) lines.push(`- 当前职位：${b.currentRole}`)
    if (b.industry) lines.push(`- 行业：${b.industry}`)
    if (b.yearsOfExperience) lines.push(`- 工作年限：${b.yearsOfExperience} 年`)
    if (b.targetRoles?.length) lines.push(`- 目标职位：${b.targetRoles.join(' / ')}`)
  }

  if (d.skills?.length) {
    lines.push('\n## 技能清单')
    const categories = {}
    d.skills.forEach(s => { (categories[s.category] ||= []).push(s) })
    Object.entries(categories).forEach(([cat, skills]) => {
      lines.push(`\n### ${cat}`)
      skills.forEach(s => {
        const parts = [`**${s.name}**`, s.proficiency]
        if (s.yearsUsed) parts.push(`${s.yearsUsed}年`)
        if (s.note) parts.push(s.note)
        lines.push(`- ${parts.join(' — ')}`)
      })
    })
  }

  if (d.experiences?.length) {
    lines.push('\n## 工作经历')
    d.experiences.forEach(e => {
      lines.push(`\n### ${e.role} · ${e.company}`)
      lines.push(`${e.duration?.start || '?'} — ${e.duration?.end || '至今'}`)
      if (e.description) lines.push(`\n${e.description}`)
      if (e.highlights?.length) { lines.push(''); e.highlights.forEach(h => lines.push(`- ${h}`)) }
    })
  }

  if (d.projects?.length) {
    lines.push('\n## 项目经历')
    const sorted = getSortedProjects()
    sorted.forEach(p => {
      lines.push(`\n### ${p.name}`)
      const meta = [p.role, p.techStack?.slice(0, 5).join(', ')].filter(Boolean).join(' | ')
      if (meta) lines.push(`*${meta}*`)
      if (p.duration?.start) lines.push(`${p.duration.start} — ${p.duration.end || '至今'}`)
      if (p.description) lines.push(`\n${p.description}`)
      if (p.highlights?.length) { lines.push(''); p.highlights.forEach(h => lines.push(`- ${h}`)) }
    })
  }

  if (d.education?.length) {
    lines.push('\n## 教育背景')
    d.education.forEach(e => {
      const parts = [e.school, e.degree, e.major, e.graduationYear ? `${e.graduationYear}年` : ''].filter(Boolean)
      lines.push(`- ${parts.join(' · ')}`)
    })
  }

  return lines.join('\n')
}

function calcRelevance(project) {
  if (!jdKeywords.value.length) return 0
  let score = 0
  const haystack = [project.name, project.description, (project.techStack || []).join(' ')].join(' ').toLowerCase()
  jdKeywords.value.forEach(kw => { if (haystack.includes(kw.toLowerCase())) score += 2 })
  return score
}

function getSortedProjects() {
  const list = [...(props.profile?.projects || [])]
  if (config.value.projectSort === 'relevance') {
    list.sort((a, b) => calcRelevance(b) - calcRelevance(a))
  } else {
    list.sort((a, b) => (b.duration?.start || '').localeCompare(a.duration?.start || ''))
  }
  if (config.value.projectCount !== 'all') return list.slice(0, Number(config.value.projectCount))
  return list
}

// --- 建议应用 / 撤销 ---
function applySuggestion(index, section, summary, snippet) {
  const prev = resumeText.value
  const change = {
    id: 'ch_' + Date.now(),
    suggestionIndex: index,
    section,
    summary,
    previousText: prev,
    snippet
  }
  changes.value.push(change)
  resumeText.value = prev + '\n\n---\n**[修改: ' + section + ']** ' + snippet
  persistChanges()
}

function applyToProject(index, section, snippet, project) {
  const prev = resumeText.value
  const projHeader = `### ${project.name}`
  const lines = resumeText.value.split('\n')
  const projIdx = lines.findIndex(l => l.trim() === projHeader)
  if (projIdx !== -1) {
    let insertIdx = projIdx + 1
    while (insertIdx < lines.length && !lines[insertIdx].match(/^(#{2,3})\s/) && !lines[insertIdx].startsWith('*')) {
      insertIdx++
    }
    let hlEnd = insertIdx - 1
    while (hlEnd > projIdx && lines[hlEnd].trim().startsWith('-')) { hlEnd-- }
    const insertAt = hlEnd + 1
    lines.splice(insertAt, 0, `- ${snippet}`)
    resumeText.value = lines.join('\n')
  } else {
    resumeText.value = prev + `\n\n**[修改: ${section}]** ${snippet}`
  }
  const change = {
    id: 'ch_' + Date.now(),
    suggestionIndex: index,
    section,
    summary: snippet.slice(0, 30),
    previousText: prev,
    snippet: `[${project.name}] ${snippet}`
  }
  changes.value.push(change)
  persistChanges()
}

function undoLast() {
  if (!changes.value.length) return
  const last = changes.value.pop()
  resumeText.value = last.previousText
  persistChanges()
}

function undoSuggestion(index) {
  const idx = changes.value.findIndex(c => c.suggestionIndex === index)
  if (idx === -1) return
  const [removed] = changes.value.splice(idx, 1)
  resumeText.value = removed.previousText
  persistChanges()
}

function persistChanges() {
  const mapped = changes.value.map(c => ({
    id: c.id, suggestionIndex: c.suggestionIndex, section: c.section, summary: c.summary, snippet: c.snippet
  }))
  emit('save-changes', mapped)
  emit('changes-updated', mapped)
}

function updateConfig(newCfg) {
  config.value = { ...config.value, ...newCfg }
  if (props.profile) resumeText.value = buildFormattedMD()
  emit('update-config', config.value)
}

// 当 profile 加载完成时，自动生成格式化 MD
watch(() => props.profile, (p) => {
  if (p && (p.skills?.length || p.experiences?.length || p.projects?.length)) {
    resumeText.value = buildFormattedMD()
  }
}, { immediate: true, deep: true })

defineExpose({ applySuggestion, undoLast, undoSuggestion, applyToProject })
</script>

<style scoped>
.resume-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* 可滚动中间区域 */
.panel-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.resume-editor {
  width: 100%;
  flex: 1;
  min-height: 300px;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--color-text);
  background: var(--color-bg);
  border: none;
  resize: none;
  outline: none;
}

/* 修改历史 */
.changes-section {
  border-top: 1px solid var(--color-border);
  padding: var(--space-sm) var(--space-md);
}

.changes-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.changes-list { list-style: none; }

.change-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-xs);
  padding: 2px 0;
}

.change-label {
  font-weight: 500;
  color: var(--blue);
  flex-shrink: 0;
  min-width: 50px;
}

.change-summary {
  flex: 1;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-undo {
  font-size: var(--text-xs);
  color: var(--red);
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-undo:hover { text-decoration: underline; }

/* 悬浮底部操作栏 */
.panel-actions {
  border-top: 1px solid var(--color-border);
  padding: var(--space-md);
  flex-shrink: 0;
  background: var(--color-surface);
  position: sticky;
  bottom: 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,.04);
}

.btn-full { width: 100%; }

/* 模板选择器 */
.template-picker { display: flex; gap: 6px; margin-bottom: var(--space-sm); }
.tpl-btn {
  flex: 1; padding: 6px 0; font-size: var(--text-xs); font-weight: 500;
  color: var(--color-text-muted); background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body); transition: all .15s;
}
.tpl-btn:hover { border-color: var(--blue); color: var(--blue); }
.tpl-btn.active { background: var(--color-primary-bg); border-color: var(--blue); color: var(--blue); font-weight: 600; }

.export-btns {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.btn-export {
  flex: 1;
  padding: 6px 0;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
}

.btn-export:hover {
  color: var(--blue);
  border-color: var(--blue);
  background: var(--color-primary-bg);
}

.export-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.btn-regenerate {
  width: 100%;
  padding: 5px 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
}

.btn-regenerate:hover {
  color: var(--blue);
}

/* === 预览等待 / 完成 === */
.preview-waiting {
  text-align: center;
  padding: var(--space-md) 0;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting-text {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.waiting-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.waiting-hint code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  background: var(--color-primary-bg);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--blue);
}

.preview-done {
  text-align: center;
}

.done-text {
  font-size: var(--text-sm);
  color: var(--color-success);
  font-weight: 500;
  margin-bottom: var(--space-sm);
}
</style>
