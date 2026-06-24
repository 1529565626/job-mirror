// server.js — 职镜本地文件服务（零依赖，纯 Node.js 内置模块）
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync, spawn } = require('child_process')

const ROOT = path.join(os.homedir(), '.jobmirror')
const LOG_DIR = path.join(__dirname, 'log')
const PROJECT_DIR = __dirname
const SKILL_FILE = path.join(__dirname, 'skill', 'SKILL.md')
const PORT = 3099

// 扫描运行中的任务
function scanTasks() {
  const tasks = []
  // 简历导入
  const ip = path.join(ROOT, 'inbox', '.progress.json')
  if (fs.existsSync(ip)) {
    const d = JSON.parse(fs.readFileSync(ip, 'utf-8'))
    if (d.status === 'running') tasks.push({ type: '导入简历', label: '简历解析', status: d.status, current: d.current, startedAt: d.startedAt, steps: d.steps?.length || 0 })
  }
  // JD 分析
  const jdDir = path.join(ROOT, 'jds')
  if (fs.existsSync(jdDir)) {
    for (const f of fs.readdirSync(jdDir)) {
      if (f.endsWith('.progress.json')) {
        const d = JSON.parse(fs.readFileSync(path.join(jdDir, f), 'utf-8'))
        if (d.status === 'running') {
          const jdId = f.replace('.progress.json', '')
          tasks.push({ type: 'JD分析', label: jdId, status: d.status, current: d.current, startedAt: d.startedAt, steps: d.steps?.length || 0 })
        }
      }
    }
  }
  return tasks
}
const ALLOW_ORIGIN = /^http:\/\/localhost:\d+$/

// 确保数据目录存在
;['inbox', 'jds', 'reports'].forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }))
fs.mkdirSync(LOG_DIR, { recursive: true })

// 启动时清理：删除无对应 JD 的残留文件 + 从备份恢复损坏的 JD
try {
  const jdDir = path.join(ROOT, 'jds')
  for (const f of fs.readdirSync(jdDir)) {
    if (f.endsWith('.progress.json') || f.endsWith('.log.txt') || f.endsWith('.prompt.txt')) {
      const jdId = f.replace(/\.(progress\.json|log\.txt|prompt\.txt)$/, '')
      if (!fs.existsSync(path.join(jdDir, jdId + '.json'))) {
        try { fs.unlinkSync(path.join(jdDir, f)) } catch {}
      }
    }
    // 从备份恢复损坏的 JD
    if (f.endsWith('.json.bak')) {
      const jdFile = path.join(jdDir, f.replace('.bak', ''))
      try {
        JSON.parse(fs.readFileSync(jdFile, 'utf-8')) // 检查原文件是否有效
      } catch {
        try {
          JSON.parse(fs.readFileSync(path.join(jdDir, f), 'utf-8')) // 验证备份
          fs.copyFileSync(path.join(jdDir, f), jdFile)
          console.log('已从备份恢复:', jdFile)
        } catch {}
      }
    }
  }
} catch {}

// 调试模式配置（运行时，不持久化到文件）
let debugMode = false
function debugLog(msg) { if (debugMode) console.log('[DEBUG]', msg) }

// 工具函数
function read(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null } }

// 修复 Claude 写入 JSON 时未转义双引号的常见问题
function repairJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    try { JSON.parse(raw); return true } catch {}
    // 状态机修复: 字符串内部的裸双引号 → 转义
    let out = ''; let inString = false; let escape = false
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      if (inString) {
        if (escape) { out += ch; escape = false; continue }
        if (ch === '\\') { out += ch; escape = true; continue }
        if (ch === '"') {
          // 检查下一个非空白字符：是 , } ] : 则为字符串结束，否则是内容引号
          const rest = raw.substring(i + 1)
          const m = rest.match(/^\s*(\S)/)
          const next = m ? m[1] : ''
          if (next === ',' || next === '}' || next === ']' || next === ':' || next === '' || next === '\n' || next === '\r') {
            inString = false; out += '"'
          } else {
            out += '\\"'
          }
          continue
        }
        out += ch; continue
      }
      if (ch === '"') inString = true
      out += ch
    }
    fs.writeFileSync(filePath, out, 'utf-8')
    try { JSON.parse(out); return true } catch { return false }
  } catch { return false }
}
function getOrigin(req) {
  const origin = req.headers.origin || ''
  return ALLOW_ORIGIN.test(origin) ? origin : 'http://localhost:5173'
}

function json(res, req, data, code = 200) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getOrigin(req)
  })
  res.end(JSON.stringify(data))
}

// 活跃进程追踪：jdId → { child, timer, startedAt, sessionDir, progressFile }
const activeProcesses = new Map()
const DEFAULT_TIMEOUT_MS = 300000 // 5 分钟

// 清理指定进程的所有资源
function cleanupProcess(jdId) {
  const entry = activeProcesses.get(jdId)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)
  activeProcesses.delete(jdId)
}

// 工具名称 → 进度描述
function toolProgressLabel(name, input) {
  const fileName = (input && (input.file_path || input.filePath || '')) ? path.basename(input.file_path || input.filePath || '') : ''
  const map = {
    Read: fileName ? '正在读取: ' + fileName : '正在读取文件…',
    Write: fileName ? '正在写入: ' + fileName : '正在写入文件…',
    Bash: '正在执行命令…',
    Grep: '正在搜索…',
    Glob: '正在查找文件…'
  }
  return map[name] || null
}

// 更新 progress.json 的 current 字段
function updateProgress(progressFile, label, stepEvents, sessionDir) {
  try {
    const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
    if (p.status !== 'running') return
    p.current = label
    fs.writeFileSync(progressFile, JSON.stringify(p))
  } catch {}
}

// 从文本块中解析 [STEP] 标记，更新 stepEvents + progress.json + session
function parseStepMarkers(text, progressFile, stepEvents, sessionDir) {
  const steps = []
  for (const line of text.split('\n')) {
    const sm = line.match(/\[STEP\]\s*(.+)/)
    if (sm) steps.push({ text: sm[1].trim(), time: new Date().toISOString() })
  }
  if (steps.length === 0) return
  // 追加 [STEP] 标记到已有步骤（不覆盖工具调用步骤）
  for (const s of steps) {
    if (!stepEvents.some(e => e.text === s.text)) stepEvents.push(s)
  }
  try {
    const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
    p.current = steps[steps.length - 1].text
    // 合并：保留已有步骤，追加新的 [STEP] 标记
    const existingTexts = new Set(p.steps.map(s => s.text))
    for (const s of steps) {
      if (!existingTexts.has(s.text)) p.steps.push(s)
    }
    fs.writeFileSync(progressFile, JSON.stringify(p))
  } catch {}
  if (sessionDir) {
    try {
      fs.writeFileSync(path.join(sessionDir, 'timeline.json'), JSON.stringify(stepEvents, null, 2))
      const mf = JSON.parse(fs.readFileSync(path.join(sessionDir, 'manifest.json'), 'utf-8'))
      mf.steps = stepEvents; mf.currentStep = stepEvents[stepEvents.length - 1].text
      fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify(mf, null, 2))
    } catch {}
  }
}

// Claude CLI 子进程调度：写入 prompt 临时文件 → spawn bash stream-json → 解析 JSON 事件更新进度 → 回调
// 同时将完整会话归档到 log/<session-id>/ 目录
// 超时保护：默认 5 分钟，超时自动 SIGTERM → SIGKILL
function runClaude({ prompt, progressFile, logFile, promptFile, sessionDir, label, metadata, onDone, jdId, timeoutMs }) {
  const startedAt = new Date().toISOString()
  const maxMs = timeoutMs || DEFAULT_TIMEOUT_MS
  fs.writeFileSync(progressFile, JSON.stringify({ status: 'running', steps: [], current: '正在启动AI引擎…', startedAt, timeoutMs: maxMs }))
  // 日志文件 = 完整交互记录（前端只展示这一个文件）
  const logHeader = `=== ${label}日志 ${startedAt} ===\n\n── [1] 📤 发送给AI的提示词 ──\n${prompt}\n\n── [2] 📥 AI返回结果 ──\n`
  fs.writeFileSync(logFile, logHeader)
  if (promptFile) fs.writeFileSync(promptFile, prompt, 'utf-8')

  // 会话归档：log/<session-id>/
  if (sessionDir) {
    fs.mkdirSync(sessionDir, { recursive: true })
    fs.writeFileSync(path.join(sessionDir, 'prompt.txt'), prompt, 'utf-8')
    fs.writeFileSync(path.join(sessionDir, 'response.txt'), logHeader)
    fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify({
      sessionId: path.basename(sessionDir),
      type: label,
      status: 'running',
      startedAt,
      timeoutMs: maxMs,
      metadata: metadata || {}
    }, null, 2))
  }

  const tmpFile = path.join(os.tmpdir(), `jobmirror-${Date.now()}.txt`)
  fs.writeFileSync(tmpFile, prompt, 'utf-8')

  const child = spawn('bash', ['-c', `claude -p --output-format stream-json --verbose < "${tmpFile.replace(/\\/g, '/')}" 2>&1`], {
    cwd: PROJECT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })

  // 注册到活跃进程表
  if (jdId) {
    cleanupProcess(jdId)
    const timer = setTimeout(() => {
      debugLog('进程超时，强制终止: ' + jdId)
      try { child.kill('SIGTERM') } catch {}
      // 1 秒后仍未退出则强制 SIGKILL
      const forceTimer = setTimeout(() => {
        try { child.kill('SIGKILL') } catch {}
      }, 1000)
      child.on('close', () => clearTimeout(forceTimer))
      // 更新进度为超时状态
      try {
        const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
        p.status = 'timeout'; p.current = `分析超时 (${Math.round(maxMs / 60000)}分钟)`
        fs.writeFileSync(progressFile, JSON.stringify(p))
      } catch {}
      if (sessionDir) {
        try {
          const mf = JSON.parse(fs.readFileSync(path.join(sessionDir, 'manifest.json'), 'utf-8'))
          mf.status = 'timeout'; mf.finishedAt = new Date().toISOString()
          fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify(mf, null, 2))
        } catch {}
      }
    }, maxMs)
    activeProcesses.set(jdId, { child, timer, startedAt, sessionDir, progressFile })
  }

  let output = ''
  const stepEvents = []
  let lastToolLabel = ''
  child.stdout.on('data', (d) => {
    const chunk = d.toString()
    // 按行解析 stream-json 事件
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue
      let event
      try { event = JSON.parse(line) } catch {
        // 非 JSON 行（stderr/错误信息）追加到日志
        try { fs.appendFileSync(logFile, '[stderr] ' + line.trim() + '\n', 'utf-8') } catch {}
        continue
      }

      // 处理不同类型的 stream-json 事件
      if (event.type === 'system') {
        const subtype = event.subtype || ''
        if (subtype === 'init') {
          updateProgress(progressFile, 'AI引擎已连接，正在分析…', stepEvents, sessionDir)
          try { fs.appendFileSync(logFile, '[系统] 引擎初始化完成\n', 'utf-8') } catch {}
        } else {
          try { fs.appendFileSync(logFile, '[系统] ' + subtype + '\n', 'utf-8') } catch {}
        }
      }
      else if (event.type === 'assistant' && event.message && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_use') {
            const toolLabel = toolProgressLabel(block.name, block.input)
            if (toolLabel) {
              // 工具调用实时更新进度（比 [STEP] 文本更及时）
              try {
                const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
                p.current = toolLabel
                if (!p.steps.some(s => s.text === toolLabel)) {
                  p.steps.push({ text: toolLabel, time: new Date().toISOString() })
                }
                fs.writeFileSync(progressFile, JSON.stringify(p))
              } catch {}
              lastToolLabel = toolLabel
            }
            try { fs.appendFileSync(logFile, '[工具调用] ' + block.name + ': ' + (toolLabel || block.name) + '\n', 'utf-8') } catch {}
          }
          else if (block.type === 'text' && block.text) {
            output += block.text
            try { fs.appendFileSync(logFile, block.text, 'utf-8') } catch {}
            if (sessionDir) {
              try { fs.appendFileSync(path.join(sessionDir, 'response.txt'), block.text, 'utf-8') } catch {}
            }
            parseStepMarkers(block.text, progressFile, stepEvents, sessionDir)
          }
        }
      }
      else if (event.type === 'user') {
        // tool_result，记录工具返回状态
        try { fs.appendFileSync(logFile, '[工具返回] 完成\n', 'utf-8') } catch {}
      }
      else if (event.type === 'result') {
        const isError = event.subtype === 'error'
        if (isError) {
          const errMsg = (event.errors && event.errors[0] && event.errors[0].message) || '未知错误'
          updateProgress(progressFile, 'AI返回错误: ' + errMsg, stepEvents, sessionDir)
          try { fs.appendFileSync(logFile, '[错误] ' + errMsg + '\n', 'utf-8') } catch {}
        }
        try { fs.appendFileSync(logFile, '[结果] subtype=' + (event.subtype || 'success') + '\n', 'utf-8') } catch {}
      }
    }
  })

  function finalize(code, errMsg) {
    const finishedAt = new Date().toISOString()
    const isTimeout = errMsg && errMsg.includes('timeout')
    // 检查当前进度状态，避免覆盖已有的 timeout 状态
    let pStatus
    try {
      const pp = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
      if (pp.status === 'timeout') { pStatus = 'timeout' }
    } catch {}
    const status = pStatus === 'timeout' ? 'timeout' : (code === 0 ? 'done' : 'error')

    const footer = errMsg ? `\n=== 进程结束: ${errMsg} ===\n` : `\n=== 进程退出，code=${code} ===\n`
    try { fs.appendFileSync(logFile, footer, 'utf-8') } catch {}

    // 更新会话归档
    if (sessionDir) {
      try {
        fs.appendFileSync(path.join(sessionDir, 'response.txt'), `\n=== 进程退出，code=${code} ===\n`, 'utf-8')
        const mf = JSON.parse(fs.readFileSync(path.join(sessionDir, 'manifest.json'), 'utf-8'))
        if (mf.status !== 'timeout') { mf.status = status; mf.exitCode = code; mf.finishedAt = finishedAt }
        mf.steps = stepEvents
        fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify(mf, null, 2))
        fs.writeFileSync(path.join(sessionDir, 'timeline.json'), JSON.stringify(stepEvents, null, 2))
      } catch(e) { debugLog('sessionDir更新失败: ' + e.message) }
    }

    try { fs.unlinkSync(tmpFile) } catch {}
    if (jdId) cleanupProcess(jdId)
    try { onDone(code, output) } catch {}
  }

  child.on('close', (code) => finalize(code, null))
  child.on('error', (err) => finalize(-1, err.message))

  return { startedAt, child }
}

// 列表目录下的 JSON 文件摘要
function list(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.includes('.progress.json') && !f.includes('.modifications.json') && !f.endsWith('.json.bak'))
      .map(f => {
        const d = read(path.join(dir, f))
        const id = f.replace('.json', '')
        if (!d) return { id, title: '(文件损坏，请重新录入)', corrupted: true }
        return { id, createdAt: d.createdAt, title: d.parsed?.title || d.id || d.title || '(无标题)', overallScore: d.match?.overallScore }
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  } catch { return [] }
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    fs.statSync(p).isDirectory() ? rmDir(p) : fs.unlinkSync(p)
  }
  fs.rmdirSync(dir)
}

// 路由表
const routes = {
  // 运行中任务
  'GET /api/tasks': () => scanTasks(),

  // 用户档案
  'GET /api/profile': () => read(path.join(ROOT, 'profile.json')) || {},
  'PUT /api/profile': (body) => { fs.writeFileSync(path.join(ROOT, 'profile.json'), JSON.stringify(body, null, 2)); return { ok: true } },
  'DELETE /api/profile': () => {
    // 删除 profile
    const pf = path.join(ROOT, 'profile.json')
    if (fs.existsSync(pf)) fs.unlinkSync(pf)
    // 删除 inbox
    rmDir(path.join(ROOT, 'inbox'))
    // 删除所有 JDs
    rmDir(path.join(ROOT, 'jds'))
    // 删除所有报告
    rmDir(path.join(ROOT, 'reports'))
    // 删除润色队列
    if (fs.existsSync(path.join(ROOT, 'polish-queue'))) rmDir(path.join(ROOT, 'polish-queue'))
    // 删除执行日志
    rmDir(LOG_DIR)
    // 重建空目录
    ;['inbox', 'jds', 'reports'].forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }))
    fs.mkdirSync(LOG_DIR, { recursive: true })
    return { ok: true }
  },

  // 岗位
  'GET /api/jds': () => {
    const dir = path.join(ROOT, 'jds')
    try {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json') && !f.includes('.progress.json') && !f.includes('.modifications.json') && !f.endsWith('.json.bak'))
        .map(f => {
          const d = read(path.join(dir, f))
          const id = f.replace('.json', '')
          if (!d) return { id, title: '(文件损坏，请重新录入)', corrupted: true }
          let overallScore = null
          const reportFile = path.join(ROOT, 'reports', id + '.json')
          if (fs.existsSync(reportFile)) {
            const report = read(reportFile)
            if (report?.match?.overallScore != null) overallScore = report.match.overallScore
          }
          return { id, createdAt: d.createdAt, title: d.title || d.parsed?.title || id || '(无标题)', overallScore }
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    } catch { return [] }
  },
  'GET /api/jds/:id': (_, id) => read(path.join(ROOT, 'jds', id + '.json')) || null,
  'POST /api/jds': (body) => {
    const id = body.id || `${new Date().toISOString().slice(0, 10)}-未命名`
    const existing = read(path.join(ROOT, 'jds', id + '.json'))
    // 保留已有的 parsed 和 reportIds，不覆盖分析结果
    const data = {
      ...body, id,
      createdAt: body.createdAt || new Date().toISOString(),
      parsed: body.parsed || (existing ? existing.parsed : null),
      reportIds: body.reportIds || (existing ? existing.reportIds : [])
    }
    fs.writeFileSync(path.join(ROOT, 'jds', id + '.json'), JSON.stringify(data, null, 2))
    return { ok: true, id }
  },
  'DELETE /api/jds/:id': (_, id) => { fs.unlinkSync(path.join(ROOT, 'jds', id + '.json')); return { ok: true } },

  // JD 自动分析
  'POST /api/jds/:id/process': (_, id) => {
    const jdFile = path.join(ROOT, 'jds', id + '.json')
    if (!fs.existsSync(jdFile)) return { ok: false, error: 'JD 不存在' }

    const profileFile = path.join(ROOT, 'profile.json')
    const reportFile = path.join(ROOT, 'reports', id + '.json')
    const progressFile = path.join(ROOT, 'jds', id + '.progress.json')
    const logFile = path.join(ROOT, 'jds', id + '.log.txt')

    if (fs.existsSync(progressFile)) {
      try {
        const prev = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
        if (prev.status === 'running' && Date.now() - new Date(prev.startedAt).getTime() < 300000) {
          return { ok: true, status: 'already-running' }
        }
      } catch {}
    }

    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true })

    // 备份 JD 原始文件（防止 Claude 写入损坏）
    const jdBackupFile = path.join(ROOT, 'jds', id + '.json.bak')
    try { fs.copyFileSync(jdFile, jdBackupFile) } catch {}

    // 会话归档目录
    const sessionId = id + '-' + Date.now().toString(36)
    const sessionDir = path.join(LOG_DIR, sessionId)
    const promptFile = path.join(ROOT, 'jds', id + '.prompt.txt')

    // ====== 完整提示词：含评分公式/分类规则/权重表/字段规范 ======
    const promptText = [
      '你是职镜AI面试助手。立即执行JD对标分析，不要反问、不要确认、直接产出结果。',
      '',
      '文件路径:',
      '- JD: ' + jdFile,
      '- 档案: ' + profileFile,
      '- 报告: ' + reportFile,
      '',
      '═══════════════════════════════════════',
      '执行步骤（5步，每步完成必须输出确认标记）',
      '═══════════════════════════════════════',
      '',
      '━━━ 步骤1/5: 解析JD ━━━',
      '目标: 从JD原文提取结构化信息',
      '操作:',
      '  1. Read JD文件，获取rawText',
      '  2. 提取: title(岗位名称) / requiredSkills[]({name,level,importance,category}) / requiredExperience({years,fields}) / requiredEducation({degree}) / responsibilities[]',
      '  3. category判定: hard(编程语言/工具/平台/证书/方法论) / soft(沟通/领导力/分析思维/协作) / industry(行业术语如B2B/SaaS/ARR/GMV/留存率)',
      '  4. importance判定: "必须/必备/要求"→required, "优先/加分/熟悉…者优先"→preferred',
      '  5. 不要直接修改JD文件。将parsed数据通过 [STEP] 输出',
      '完成时输出: [STEP] ✓ 步骤1/5完成 | PARSED: { "title":"...", "requiredSkills":[...], "requiredExperience":{...}, "requiredEducation":{...}, "responsibilities":[...] }',
      '如失败输出: [ERROR] 步骤1失败 — <原因>（立即中止，不执行后续步骤）',
      '',
      '━━━ 步骤2/5: 技能对标 ━━━',
      '目标: 逐技能对比用户档案与JD要求，判定matched/partial/missing',
      '操作:',
      '  1. Read 档案文件',
      '  2. 对JD每项requiredSkill，在用户skills中按name查找(允许语义相近匹配)',
      '  3. 熟练度→数值: expert=5/proficient=4/advanced=3/intermediate=2/novice=1',
      '  4. JD程度→数值: 精通=4/熟练=3/掌握/熟悉=2/了解=1',
      '  5. 判定: 用户数值>=JD数值→matched, 用户数值>0且<JD数值→partial, 用户无此技能→missing',
      '  6. partial/missing→生成learningAdvice。suggestions[]每项必须是对象{type(course/practice/project/book),title,description,estimatedHours}，不能是纯字符串。同时生成gapStory({strategy,sampleResponse})',
      '完成时输出: [STEP] ✓ 步骤2/5完成 — {matched}项满足/{partial}项部分满足/{missing}项缺失',
      '如失败输出: [ERROR] 步骤2失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤3/5: 计算匹配度 ━━━',
      '目标: 计算三维匹配分+综合分，识别特殊场景调整权重',
      '操作:',
      '  1. skillMatch = Σ(贡献)/Σ(权重)×100, required权重3/preferred权重1, matched贡献1.0/partial贡献0.5/missing贡献0',
      '  2. experienceMatch: 年限>=1.5×要求→100, >=要求→90, >=0.7→70, >=0.5→50, <0.5→30',
      '  3. educationMatch: >=要求→100, -1级→60, <-1级→30',
      '  4. overallScore = skillMatch×0.5 + experienceMatch×0.3 + educationMatch×0.2, 取最近5的倍数',
      '  5. 检测场景: 应届生(yearsOfExperience=0)→教育权重0.5/经验0.2; 转行者(行业无交集)→技能0.6/经验0.1; 高管(≥10年)→经验0.4/教育0.1',
      '完成时输出: [STEP] ✓ 步骤3/5完成 — 技能{sk}%/经验{ex}%/学历{ed}% → 综合{overall}%{场景标记}',
      '如失败输出: [ERROR] 步骤3失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤4/5: 生成报告 ━━━',
      '目标: 生成完整的分析报告内容',
      '操作:',
      '  1. resumeSuggestions(≤5条,含section/priority/issue/suggestion{before,after,formula,note}/reason,按priority+category排序)',
      '  2. interviewPrep(2-4主题,含topic/importance/prepPoints[]/starStory{situation,task,action,result}/sourceExperience)',
      '  3. predictedQuestions(3-5题,含question/whyThisQuestion/relatedExperience/suggestedFramework)',
      '  4. ATS兼容性检查(排版格式/联系方式位置/图片特殊字符/Section标题/关键词密度)',
      '完成时输出: [STEP] ✓ 步骤4/5完成 — {N}条简历建议/{M}个面试主题/{Q}道预测题',
      '如失败输出: [ERROR] 步骤4失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤5/5: 写入报告 ━━━',
      '目标: 持久化报告',
      '操作:',
      '  1. Write 报告文件，JSON 2空格缩进UTF-8。必须包含以下字段（参照skill/SKILL.md数据模型）:',
'     match: { overallScore, summary, breakdown:{skillMatch,experienceMatch,educationMatch}, weightAdjustment, weightAdjustmentReason }',
'     skillAnalysis[]: { skillName, category(hard/soft/industry), match(matched/partial/missing), jdRequirement, userProficiency, learningAdvice }',
'     resumeSuggestions[]: { section, priority(high/medium/low), issue, suggestion:{before,after,formula,note}, reason }',
'     interviewPrep[]: { topic, importance, prepPoints[], starStory:{situation,task,action,result}, sourceExperience }',
'     predictedQuestions[]: { question, whyThisQuestion, relatedExperience, suggestedFramework }',
'     profileSnapshot: { skillCount, industry, yearsOfExperience }',
      '  2. 不要修改JD文件。服务端会在分析完成后自动更新JD的parsed和reportIds',
      '完成时输出: [STEP] ✓ 步骤5/5完成 — 报告已写入{reportFile}',
      '如失败输出: [ERROR] 步骤5失败 — <原因>（立即中止）',
      '',
      '═══════════════════════════════════════',
      '规则:',
      '- 每步完成立即输出确认标记，不要等所有步骤做完再一起输出',
      '- 步骤之间有强依赖（前一步的输出是后一步的输入），任何步骤失败必须立即中止，输出 [ERROR] 步骤X失败 — <原因> 然后停止，不要继续执行后续步骤',
      '- 如果某步骤执行时间超过 60 秒，视为失败，输出 [ERROR] 步骤X超时 — 已中止 然后停止',
      '- 所有步骤成功后输出 DONE',
      '- 不要反问，不要确认，直接执行',
      '- JSON 写入规则：所有字符串值内的 ASCII 双引号（"）必须转义为 \\"，如 "JD标注\\"必备\\""。中文弯引号不需要转义。如果不确定，读回文件用 JSON.parse 验证。',
      '═══════════════════════════════════════'
    ].join('\n')

    runClaude({
      progressFile, logFile, promptFile, sessionDir,
      label: 'JD分析', jdId: id,
      metadata: { jdId: id, jdFile, profileFile, reportFile },
      prompt: promptText,
      onDone: (code, output) => {
        const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
        // 修复 Claude 写入 JSON 时的常见问题（未转义双引号等）
        if (fs.existsSync(reportFile)) repairJSON(reportFile)
        const reportExists = fs.existsSync(reportFile)

        // 从 Claude stdout 提取步骤1的 PARSED JSON
        let parsed = null
        if (output) {
          for (const line of output.split('\n')) {
            const idx = line.indexOf('PARSED:')
            if (idx === -1) continue
            const jsonStr = line.substring(idx + 7).trim()
            // 贪婪匹配：从第一个 { 到最后一个 }
            const m = jsonStr.match(/(\{.+\})\s*$/)
            if (m) { try { parsed = JSON.parse(m[1]) } catch {} }
            if (parsed) break
          }
        }

        // done 判定：报告文件存在即可（PARSED 提取失败也允许，因为 report 本身有完整数据）
        const done = reportExists

        // 服务端负责更新 JD 文件
        if (parsed) {
          try {
            const jd = JSON.parse(fs.readFileSync(jdFile, 'utf-8'))
            jd.parsed = parsed
            if (!jd.reportIds) jd.reportIds = []
            if (!jd.reportIds.includes(id)) jd.reportIds.push(id)
            fs.writeFileSync(jdFile, JSON.stringify(jd, null, 2))
          } catch {}
        } else if (done) {
          // 没有 PARSED 但有报告，更新 reportIds
          try {
            const jd = JSON.parse(fs.readFileSync(jdFile, 'utf-8'))
            if (!jd.reportIds) jd.reportIds = []
            if (!jd.reportIds.includes(id)) jd.reportIds.push(id)
            fs.writeFileSync(jdFile, JSON.stringify(jd, null, 2))
          } catch {}
        }

        p.status = done ? 'done' : 'error'
        p.current = done ? '分析完成' : ('分析失败 (exit=' + code + ')，请查看日志')
        p.reportId = done ? id : null
        p.sessionId = sessionId
        fs.writeFileSync(progressFile, JSON.stringify(p))
        try {
          const mf = JSON.parse(fs.readFileSync(path.join(sessionDir, 'manifest.json'), 'utf-8'))
          mf.status = p.status; mf.reportId = p.reportId; mf.finishedAt = new Date().toISOString()
          fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify(mf, null, 2))
        } catch {}
      }
    })

    return { ok: true, status: 'started', sessionId }
  },

  'GET /api/jds/:id/progress': (_, id) => {
    const p = path.join(ROOT, 'jds', id + '.progress.json')
    if (!fs.existsSync(p)) return { status: 'idle', steps: [], current: '空闲' }
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    // 超时检测：运行中超过 5 分钟且无活跃进程引用
    if (data.status === 'running' && data.startedAt) {
      const elapsed = Date.now() - new Date(data.startedAt).getTime()
      const maxMs = data.timeoutMs || DEFAULT_TIMEOUT_MS
      if (elapsed > maxMs && !activeProcesses.has(id)) {
        data.status = 'timeout'
        data.current = `分析超时 (${Math.round(maxMs / 60000)}分钟)`
      }
    }
    return data
  },

  'GET /api/jds/:id/log': (_, id) => {
    const p = path.join(ROOT, 'jds', id + '.log.txt')
    if (!fs.existsSync(p)) return { text: '(暂无日志)' }
    return { text: fs.readFileSync(p, 'utf-8').slice(-16000) }
  },

  'GET /api/jds/:id/prompt': (_, id) => {
    const p = path.join(ROOT, 'jds', id + '.prompt.txt')
    if (!fs.existsSync(p)) return { text: '(暂无提示词记录)' }
    return { text: fs.readFileSync(p, 'utf-8') }
  },

  // 取消正在运行的分析
  'POST /api/jds/:id/cancel': (_, id) => {
    const entry = activeProcesses.get(id)
    if (!entry) return { ok: false, error: '没有运行中的分析任务' }
    try { entry.child.kill('SIGTERM') } catch {}
    setTimeout(() => { try { entry.child.kill('SIGKILL') } catch {} }, 1000)
    cleanupProcess(id)
    try {
      const p = JSON.parse(fs.readFileSync(entry.progressFile, 'utf-8'))
      p.status = 'cancelled'; p.current = '已取消'
      fs.writeFileSync(entry.progressFile, JSON.stringify(p))
    } catch {}
    if (entry.sessionDir) {
      try {
        const mf = JSON.parse(fs.readFileSync(path.join(entry.sessionDir, 'manifest.json'), 'utf-8'))
        mf.status = 'cancelled'; mf.finishedAt = new Date().toISOString()
        fs.writeFileSync(path.join(entry.sessionDir, 'manifest.json'), JSON.stringify(mf, null, 2))
      } catch {}
    }
    return { ok: true, status: 'cancelled' }
  },

  // 独立校验任务结果
  'POST /api/jds/:id/verify': (_, id) => {
    const issues = []
    const jdFile = path.join(ROOT, 'jds', id + '.json')
    const reportFile = path.join(ROOT, 'reports', id + '.json')

    // 检查 JD 文件
    let jd = null
    if (!fs.existsSync(jdFile)) {
      issues.push({ level: 'error', file: 'JD', msg: 'JD 文件不存在' })
    } else {
      try {
        jd = JSON.parse(fs.readFileSync(jdFile, 'utf-8'))
        if (!jd.parsed || !jd.parsed.title) issues.push({ level: 'warn', file: 'JD', msg: 'JD 尚未解析 (parsed 为空)' })
        else {
          const skillCount = jd.parsed.requiredSkills?.length || 0
          if (skillCount === 0) issues.push({ level: 'warn', file: 'JD', msg: 'parsed 中无技能数据' })
          else issues.push({ level: 'ok', file: 'JD', msg: `已解析 ${skillCount} 项技能` })
        }
      } catch (e) {
        issues.push({ level: 'error', file: 'JD', msg: 'JD JSON 解析失败: ' + e.message })
      }
    }

    // 检查报告文件
    let report = null
    if (!fs.existsSync(reportFile)) {
      issues.push({ level: 'error', file: 'Report', msg: '报告文件不存在' })
    } else {
      try {
        report = JSON.parse(fs.readFileSync(reportFile, 'utf-8'))
        if (!report.match || report.match.overallScore === undefined) {
          issues.push({ level: 'error', file: 'Report', msg: '报告缺少 match 评分数据' })
        } else {
          issues.push({ level: 'ok', file: 'Report', msg: `综合匹配度 ${report.match.overallScore}%` })
        }
        if (report.skillAnalysis) issues.push({ level: 'ok', file: 'Report', msg: `技能分析 ${report.skillAnalysis.length} 项` })
      } catch (e) {
        issues.push({ level: 'error', file: 'Report', msg: '报告 JSON 解析失败: ' + e.message })
      }
    }

    // 检查关联
    if (jd && report) {
      if (jd.reportIds && jd.reportIds.includes(id)) {
        issues.push({ level: 'ok', file: 'Link', msg: 'JD ↔ 报告关联正确' })
      } else {
        issues.push({ level: 'warn', file: 'Link', msg: 'JD 的 reportIds 未包含此报告' })
      }
    }

    const hasError = issues.some(i => i.level === 'error')
    const canRetry = !activeProcesses.has(id)

    return {
      status: hasError ? 'incomplete' : 'ok',
      issues,
      canRetry,
      canCancel: activeProcesses.has(id)
    }
  },

  // 重试失败/超时的分析
  'POST /api/jds/:id/retry': (_, id) => {
    const jdFile = path.join(ROOT, 'jds', id + '.json')
    if (!fs.existsSync(jdFile)) return { ok: false, error: 'JD 不存在' }

    // 检查是否有运行中的任务
    if (activeProcesses.has(id)) return { ok: false, error: '该 JD 正在分析中' }

    // 从备份恢复 JD 原始文件（如果上次分析损坏了 JSON）
    const jdBackupFile = path.join(ROOT, 'jds', id + '.json.bak')
    if (fs.existsSync(jdBackupFile)) {
      try {
        // 验证备份文件是有效的 JSON
        JSON.parse(fs.readFileSync(jdBackupFile, 'utf-8'))
        fs.copyFileSync(jdBackupFile, jdFile)
      } catch {}
    }

    // 清理旧进度和日志
    const progressFile = path.join(ROOT, 'jds', id + '.progress.json')
    const logFile = path.join(ROOT, 'jds', id + '.log.txt')
    const promptFile = path.join(ROOT, 'jds', id + '.prompt.txt')
    try { if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile) } catch {}
    try { if (fs.existsSync(logFile)) fs.unlinkSync(logFile) } catch {}
    try { if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile) } catch {}

    // 触发重新分析：复用 /process 的逻辑
    const profileFile = path.join(ROOT, 'profile.json')
    const reportFile = path.join(ROOT, 'reports', id + '.json')
    const sessionId = id + '-' + Date.now().toString(36)
    const sessionDir = path.join(LOG_DIR, sessionId)
    const pFile = path.join(ROOT, 'jds', id + '.prompt.txt')

    const promptText = [
      '你是职镜AI面试助手。立即执行JD对标分析，不要反问、不要确认、直接产出结果。',
      '',
      '文件路径:',
      '- JD: ' + jdFile,
      '- 档案: ' + profileFile,
      '- 报告: ' + reportFile,
      '',
      '═══════════════════════════════════════',
      '执行步骤（5步，每步完成必须输出确认标记）',
      '═══════════════════════════════════════',
      '',
      '━━━ 步骤1/5: 解析JD ━━━',
      '目标: 从JD原文提取结构化信息',
      '操作:',
      '  1. Read JD文件，获取rawText',
      '  2. 提取: title(岗位名称) / requiredSkills[]({name,level,importance,category}) / requiredExperience({years,fields}) / requiredEducation({degree}) / responsibilities[]',
      '  3. category判定: hard(编程语言/工具/平台/证书/方法论) / soft(沟通/领导力/分析思维/协作) / industry(行业术语如B2B/SaaS/ARR/GMV/留存率)',
      '  4. importance判定: "必须/必备/要求"→required, "优先/加分/熟悉…者优先"→preferred',
      '  5. 不要直接修改JD文件。将parsed数据通过 [STEP] 输出',
      '完成时输出: [STEP] ✓ 步骤1/5完成 | PARSED: { "title":"...", "requiredSkills":[...], "requiredExperience":{...}, "requiredEducation":{...}, "responsibilities":[...] }',
      '如失败输出: [ERROR] 步骤1失败 — <原因>（立即中止，不执行后续步骤）',
      '',
      '━━━ 步骤2/5: 技能对标 ━━━',
      '目标: 逐技能对比用户档案与JD要求，判定matched/partial/missing',
      '操作:',
      '  1. Read 档案文件',
      '  2. 对JD每项requiredSkill，在用户skills中按name查找(允许语义相近匹配)',
      '  3. 熟练度→数值: expert=5/proficient=4/advanced=3/intermediate=2/novice=1',
      '  4. JD程度→数值: 精通=4/熟练=3/掌握/熟悉=2/了解=1',
      '  5. 判定: 用户数值>=JD数值→matched, 用户数值>0且<JD数值→partial, 用户无此技能→missing',
      '  6. partial/missing→生成learningAdvice。suggestions[]每项必须是对象{type(course/practice/project/book),title,description,estimatedHours}，不能是纯字符串。同时生成gapStory({strategy,sampleResponse})',
      '完成时输出: [STEP] ✓ 步骤2/5完成 — {matched}项满足/{partial}项部分满足/{missing}项缺失',
      '如失败输出: [ERROR] 步骤2失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤3/5: 计算匹配度 ━━━',
      '目标: 计算三维匹配分+综合分，识别特殊场景调整权重',
      '操作:',
      '  1. skillMatch = Σ(贡献)/Σ(权重)×100, required权重3/preferred权重1, matched贡献1.0/partial贡献0.5/missing贡献0',
      '  2. experienceMatch: 年限>=1.5×要求→100, >=要求→90, >=0.7→70, >=0.5→50, <0.5→30',
      '  3. educationMatch: >=要求→100, -1级→60, <-1级→30',
      '  4. overallScore = skillMatch×0.5 + experienceMatch×0.3 + educationMatch×0.2, 取最近5的倍数',
      '  5. 检测场景: 应届生(yearsOfExperience=0)→教育权重0.5/经验0.2; 转行者(行业无交集)→技能0.6/经验0.1; 高管(≥10年)→经验0.4/教育0.1',
      '完成时输出: [STEP] ✓ 步骤3/5完成 — 技能{sk}%/经验{ex}%/学历{ed}% → 综合{overall}%{场景标记}',
      '如失败输出: [ERROR] 步骤3失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤4/5: 生成报告 ━━━',
      '目标: 生成完整的分析报告内容',
      '操作:',
      '  1. resumeSuggestions(≤5条,含section/priority/issue/suggestion{before,after,formula,note}/reason,按priority+category排序)',
      '  2. interviewPrep(2-4主题,含topic/importance/prepPoints[]/starStory{situation,task,action,result}/sourceExperience)',
      '  3. predictedQuestions(3-5题,含question/whyThisQuestion/relatedExperience/suggestedFramework)',
      '  4. ATS兼容性检查(排版格式/联系方式位置/图片特殊字符/Section标题/关键词密度)',
      '完成时输出: [STEP] ✓ 步骤4/5完成 — {N}条简历建议/{M}个面试主题/{Q}道预测题',
      '如失败输出: [ERROR] 步骤4失败 — <原因>（立即中止）',
      '',
      '━━━ 步骤5/5: 写入报告 ━━━',
      '目标: 持久化报告',
      '操作:',
      '  1. Write 报告文件，JSON 2空格缩进UTF-8。必须包含以下字段（参照skill/SKILL.md数据模型）:',
'     match: { overallScore, summary, breakdown:{skillMatch,experienceMatch,educationMatch}, weightAdjustment, weightAdjustmentReason }',
'     skillAnalysis[]: { skillName, category(hard/soft/industry), match(matched/partial/missing), jdRequirement, userProficiency, learningAdvice }',
'     resumeSuggestions[]: { section, priority(high/medium/low), issue, suggestion:{before,after,formula,note}, reason }',
'     interviewPrep[]: { topic, importance, prepPoints[], starStory:{situation,task,action,result}, sourceExperience }',
'     predictedQuestions[]: { question, whyThisQuestion, relatedExperience, suggestedFramework }',
'     profileSnapshot: { skillCount, industry, yearsOfExperience }',
      '  2. 不要修改JD文件。服务端会在分析完成后自动更新JD的parsed和reportIds',
      '完成时输出: [STEP] ✓ 步骤5/5完成 — 报告已写入{reportFile}',
      '如失败输出: [ERROR] 步骤5失败 — <原因>（立即中止）',
      '',
      '═══════════════════════════════════════',
      '规则:',
      '- 每步完成立即输出确认标记，不要等所有步骤做完再一起输出',
      '- 步骤之间有强依赖（前一步的输出是后一步的输入），任何步骤失败必须立即中止，输出 [ERROR] 步骤X失败 — <原因> 然后停止，不要继续执行后续步骤',
      '- 如果某步骤执行时间超过 60 秒，视为失败，输出 [ERROR] 步骤X超时 — 已中止 然后停止',
      '- 所有步骤成功后输出 DONE',
      '- 不要反问，不要确认，直接执行',
      '- JSON 写入规则：所有字符串值内的 ASCII 双引号（"）必须转义为 \\"，如 "JD标注\\"必备\\""。中文弯引号不需要转义。如果不确定，读回文件用 JSON.parse 验证。',
      '═══════════════════════════════════════'
    ].join('\n')

    runClaude({
      progressFile, logFile, promptFile: pFile, sessionDir,
      label: 'JD分析（重试）', jdId: id,
      metadata: { jdId: id, jdFile, profileFile, reportFile, retry: true },
      prompt: promptText,
      onDone: (code, output) => {
        try {
          const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
          let parsed = null
          const parsedMatch = (output || '').match(/PARSED:\s*(\{[\s\S]+?\})\s*(?:\n|$)/)
          if (parsedMatch) { try { parsed = JSON.parse(parsedMatch[1]) } catch {} }
          if (fs.existsSync(reportFile)) repairJSON(reportFile)
          const reportExists = fs.existsSync(reportFile)
          const done = !!parsed && reportExists
          if (parsed) {
            try {
              const jd = JSON.parse(fs.readFileSync(jdFile, 'utf-8'))
              jd.parsed = parsed
              if (!jd.reportIds) jd.reportIds = []
              if (!jd.reportIds.includes(id)) jd.reportIds.push(id)
              fs.writeFileSync(jdFile, JSON.stringify(jd, null, 2))
            } catch {}
          }
          p.status = done ? 'done' : 'error'
          p.current = done ? '分析完成（重试成功）' : ('重试失败 (exit=' + code + ')，请查看日志')
          p.reportId = done ? id : null
          p.sessionId = sessionId
          fs.writeFileSync(progressFile, JSON.stringify(p))
        } catch {}
      }
    })

    return { ok: true, status: 'started', sessionId }
  },

  // ====== 日志会话归档 API ======
  'GET /api/log/sessions': () => {
    try {
      const dirs = fs.readdirSync(LOG_DIR).filter(f => {
        const p = path.join(LOG_DIR, f)
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'manifest.json'))
      })
      return dirs.sort().reverse().slice(0, 50).map(id => {
        const mf = JSON.parse(fs.readFileSync(path.join(LOG_DIR, id, 'manifest.json'), 'utf-8'))
        return { sessionId: id, ...mf }
      })
    } catch { return [] }
  },

  'GET /api/log/sessions/:id': (_, id) => {
    const dir = path.join(LOG_DIR, decodeURIComponent(id))
    if (!fs.existsSync(dir)) return { error: '会话不存在' }
    const mf = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8'))
    const prompt = fs.existsSync(path.join(dir, 'prompt.txt')) ? fs.readFileSync(path.join(dir, 'prompt.txt'), 'utf-8') : ''
    const response = fs.existsSync(path.join(dir, 'response.txt')) ? fs.readFileSync(path.join(dir, 'response.txt'), 'utf-8').slice(-32000) : ''
    const timeline = fs.existsSync(path.join(dir, 'timeline.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf-8')) : []
    return { ...mf, prompt, response, timeline }
  },

  // 调试模式切换
  'GET /api/settings/debug': () => ({ enabled: debugMode }),
  'PUT /api/settings/debug': (body) => { debugMode = !!body.enabled; console.log('调试模式:', debugMode ? '开启' : '关闭'); return { enabled: debugMode } },

  // 报告
  'GET /api/reports': () => list(path.join(ROOT, 'reports')),
  'GET /api/reports/:id': (_, id) => read(path.join(ROOT, 'reports', id + '.json')) || null,
  'DELETE /api/reports/:id': (_, id) => { fs.unlinkSync(path.join(ROOT, 'reports', id + '.json')); return { ok: true } },

  // 收件箱
  'PUT /api/inbox/resume': (body) => { fs.writeFileSync(path.join(ROOT, 'inbox', 'resume.txt'), body.rawText || '', 'utf-8'); return { ok: true } },
  'GET /api/inbox/resume': () => {
    const p = path.join(ROOT, 'inbox', 'resume.txt')
    if (!fs.existsSync(p)) return null
    return { rawText: fs.readFileSync(p, 'utf-8'), size: fs.statSync(p).size }
  },
  'GET /api/inbox/status': () => {
    const p = path.join(ROOT, 'inbox', 'resume.txt')
    const exists = fs.existsSync(p)
    const processed = fs.existsSync(path.join(ROOT, 'inbox', '.processed'))
    return { exists, processed, size: exists ? fs.statSync(p).size : 0 }
  },

  // 自动处理收件箱
  'POST /api/inbox/process': () => {
    const resumePath = path.join(ROOT, 'inbox', 'resume.txt')
    if (!fs.existsSync(resumePath)) return { ok: false, error: '收件箱为空' }

    const progressFile = path.join(ROOT, 'inbox', '.progress.json')
    const processed = path.join(ROOT, 'inbox', '.processed')
    const logFile = path.join(ROOT, 'inbox', '.log.txt')

    if (fs.existsSync(progressFile)) {
      const prev = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
      if (prev.status === 'running') {
        const age = Date.now() - new Date(prev.startedAt).getTime()
        if (age < 300000 && !fs.existsSync(processed)) return { ok: true, status: 'already-running' }
      }
    }

    if (fs.existsSync(processed)) fs.unlinkSync(processed)

    const sessionId = 'inbox-' + Date.now().toString(36)
    const sessionDir = path.join(LOG_DIR, sessionId)
    const ipromptFile = path.join(ROOT, 'inbox', '.prompt.txt')
    runClaude({
      progressFile, logFile, promptFile: ipromptFile, sessionDir,
      label: '简历导入', jdId: 'inbox',
      metadata: { type: 'inbox' },
      prompt: 'Read ' + SKILL_FILE + '，严格按照其中的「工作流 0: 导入收件箱」执行。每完成一步输出 [STEP] 步骤描述。最后输出 DONE。',
      onDone: (code) => {
        const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
        p.status = fs.existsSync(processed) ? 'done' : 'error'
        p.current = fs.existsSync(processed) ? '导入完成' : ('导入失败 (exit=' + code + ')，请查看日志')
        p.exitCode = code; p.sessionId = sessionId
        fs.writeFileSync(progressFile, JSON.stringify(p))
      }
    })

    return { ok: true, status: 'started', sessionId }
  },

  // 取消收件箱处理
  'POST /api/inbox/cancel': () => {
    const entry = activeProcesses.get('inbox')
    if (!entry) return { ok: false, error: '没有运行中的导入任务' }
    try { entry.child.kill('SIGTERM') } catch {}
    setTimeout(() => { try { entry.child.kill('SIGKILL') } catch {} }, 1000)
    cleanupProcess('inbox')
    try {
      const p = JSON.parse(fs.readFileSync(entry.progressFile, 'utf-8'))
      p.status = 'cancelled'; p.current = '已取消'
      fs.writeFileSync(entry.progressFile, JSON.stringify(p))
    } catch {}
    return { ok: true, status: 'cancelled' }
  },

  // 校验收件箱处理结果
  'POST /api/inbox/verify': () => {
    const issues = []
    const profileFile = path.join(ROOT, 'profile.json')
    const resumeFile = path.join(ROOT, 'inbox', 'resume.txt')
    const processed = path.join(ROOT, 'inbox', '.processed')

    if (!fs.existsSync(resumeFile)) issues.push({ level: 'error', file: 'Inbox', msg: '收件箱为空' })
    else issues.push({ level: 'ok', file: 'Inbox', msg: `简历文件 ${(fs.statSync(resumeFile).size / 1024).toFixed(1)} KB` })

    if (fs.existsSync(processed)) issues.push({ level: 'ok', file: 'Process', msg: '已标记为已处理' })
    else issues.push({ level: 'warn', file: 'Process', msg: '尚未完成处理' })

    if (!fs.existsSync(profileFile)) {
      issues.push({ level: 'error', file: 'Profile', msg: '档案文件不存在' })
    } else {
      try {
        const pf = JSON.parse(fs.readFileSync(profileFile, 'utf-8'))
        const skillCount = pf.skills?.length || 0
        const expCount = pf.experiences?.length || 0
        if (skillCount === 0 && expCount === 0) issues.push({ level: 'warn', file: 'Profile', msg: '档案为空（无技能和经历）' })
        else issues.push({ level: 'ok', file: 'Profile', msg: `${skillCount} 项技能, ${expCount} 段经历` })
      } catch (e) {
        issues.push({ level: 'error', file: 'Profile', msg: '档案 JSON 解析失败: ' + e.message })
      }
    }

    const hasError = issues.some(i => i.level === 'error')
    return { status: hasError ? 'incomplete' : 'ok', issues, canRetry: !activeProcesses.has('inbox'), canCancel: activeProcesses.has('inbox') }
  },

  // 重试收件箱处理
  'POST /api/inbox/retry': () => {
    const resumePath = path.join(ROOT, 'inbox', 'resume.txt')
    if (!fs.existsSync(resumePath)) return { ok: false, error: '收件箱为空' }
    if (activeProcesses.has('inbox')) return { ok: false, error: '收件箱正在处理中' }

    // 清理旧进度
    const progressFile = path.join(ROOT, 'inbox', '.progress.json')
    const logFile = path.join(ROOT, 'inbox', '.log.txt')
    const promptFile = path.join(ROOT, 'inbox', '.prompt.txt')
    const processed = path.join(ROOT, 'inbox', '.processed')
    try { if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile) } catch {}
    try { if (fs.existsSync(logFile)) fs.unlinkSync(logFile) } catch {}
    try { if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile) } catch {}
    try { if (fs.existsSync(processed)) fs.unlinkSync(processed) } catch {}

    const sessionId = 'inbox-' + Date.now().toString(36)
    const sessionDir = path.join(LOG_DIR, sessionId)
    const ipromptFile = path.join(ROOT, 'inbox', '.prompt.txt')
    runClaude({
      progressFile, logFile, promptFile: ipromptFile, sessionDir,
      label: '简历导入（重试）', jdId: 'inbox',
      metadata: { type: 'inbox', retry: true },
      prompt: 'Read ' + SKILL_FILE + '，严格按照其中的「工作流 0: 导入收件箱」执行。每完成一步输出 [STEP] 步骤描述。最后输出 DONE。',
      onDone: (code) => {
        const p = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
        p.status = fs.existsSync(processed) ? 'done' : 'error'
        p.current = fs.existsSync(processed) ? '导入完成（重试成功）' : ('重试失败 (exit=' + code + ')，请查看日志')
        p.exitCode = code; p.sessionId = sessionId
        fs.writeFileSync(progressFile, JSON.stringify(p))
      }
    })

    return { ok: true, status: 'started', sessionId }
  },

  // 导入进度查询
  'GET /api/inbox/progress': () => {
    const p = path.join(ROOT, 'inbox', '.progress.json')
    if (!fs.existsSync(p)) return { status: 'idle', steps: [], current: '空闲' }
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    // 如果进程似乎卡住了（超过 5 分钟还在 running），标记超时
    if (data.status === 'running' && Date.now() - new Date(data.startedAt).getTime() > 300000) {
      data.status = 'timeout'
      data.current = '处理超时，请重新上传'
    }
    return data
  },

  // 导入日志查询（调试用）
  'GET /api/inbox/log': () => {
    const p = path.join(ROOT, 'inbox', '.log.txt')
    if (!fs.existsSync(p)) return { text: '(暂无日志)' }
    return { text: fs.readFileSync(p, 'utf-8').slice(-16000) }
  },

  // 导入提示词查询（调试用）
  'GET /api/inbox/prompt': () => {
    const p = path.join(ROOT, 'inbox', '.prompt.txt')
    if (!fs.existsSync(p)) return { text: '(暂无提示词记录)' }
    return { text: fs.readFileSync(p, 'utf-8') }
  },

  // 导入状态持久化（跨页面刷新保留等待态）
  'PUT /api/inbox/import-state': (body) => { fs.writeFileSync(path.join(ROOT, 'inbox', '.import-state.json'), JSON.stringify(body)); return { ok: true } },
  'GET /api/inbox/import-state': () => read(path.join(ROOT, 'inbox', '.import-state.json')) || null,
  'DELETE /api/inbox/import-state': () => {
    const p = path.join(ROOT, 'inbox', '.import-state.json')
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  },

  // 报告修改历史（每报告独立的 modifications）→ `reports/<id>.modifications.json`
  'GET /api/reports/:id/modifications': (_, id) => read(path.join(ROOT, 'reports', decodeURIComponent(id) + '.modifications.json')) || { changes: [], config: {} },
  'PUT /api/reports/:id/modifications': (body, id) => { fs.writeFileSync(path.join(ROOT, 'reports', decodeURIComponent(id) + '.modifications.json'), JSON.stringify(body, null, 2)); return { ok: true } },
  'DELETE /api/reports/:id/modifications': (_, id) => {
    const p = path.join(ROOT, 'reports', decodeURIComponent(id) + '.modifications.json')
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  },

  // 简历预览渲染（design-keai HTML，前端直接生成 + server 持久化）
  'PUT /api/inbox/resume-preview': (body) => {
    fs.writeFileSync(path.join(ROOT, 'inbox', 'resume-preview.md'), body.md || '', 'utf-8')
    const state = { status: body.html ? 'done' : 'waiting', reportId: body.reportId || '', startedAt: new Date().toISOString() }
    fs.writeFileSync(path.join(ROOT, 'inbox', '.resume-preview-state.json'), JSON.stringify(state))
    if (body.html) fs.writeFileSync(path.join(ROOT, 'inbox', 'resume-preview.html'), body.html, 'utf-8')
    return { ok: true }
  },
  'GET /api/inbox/resume-preview': () => {
    const state = read(path.join(ROOT, 'inbox', '.resume-preview-state.json'))
    if (!state) return { status: 'idle' }
    if (state.status === 'done') {
      const html = fs.readFileSync(path.join(ROOT, 'inbox', 'resume-preview.html'), 'utf-8')
      return { status: 'done', html }
    }
    return state
  },

  // JD 分析状态持久化（跨页面刷新保留等待态）
  'PUT /api/inbox/jd-analysis-state': (body) => { fs.writeFileSync(path.join(ROOT, 'inbox', '.jd-analysis-state.json'), JSON.stringify(body)); return { ok: true } },
  'GET /api/inbox/jd-analysis-state': () => read(path.join(ROOT, 'inbox', '.jd-analysis-state.json')) || null,
  'DELETE /api/inbox/jd-analysis-state': () => {
    const p = path.join(ROOT, 'inbox', '.jd-analysis-state.json')
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  },

  // 原始简历文件（二进制存储，用于前端内嵌展示 PDF/DOCX）
  'PUT /api/inbox/resume/file': (body) => {
    fs.writeFileSync(path.join(ROOT, 'inbox', 'resume.bin'), Buffer.from(body.data, 'base64'))
    fs.writeFileSync(path.join(ROOT, 'inbox', 'resume.meta'), JSON.stringify({ fileName: body.fileName, fileType: body.fileType }))
    return { ok: true }
  },
  'GET /api/inbox/resume/file': () => {
    const meta = read(path.join(ROOT, 'inbox', 'resume.meta'))
    if (!meta) return null
    const data = fs.readFileSync(path.join(ROOT, 'inbox', 'resume.bin'))
    return { data: data.toString('base64'), fileName: meta.fileName, fileType: meta.fileType }
  },

  // AI 润色（同步执行，Claude CLI 直接处理）
  'POST /api/polish': (body) => {
    const { itemType, itemLabel, originalText, context } = body
    if (!originalText || !originalText.trim()) return { ok: false, error: '原文为空' }

    const prompt = itemType === 'project'
      ? `润色以下项目经历描述。\n约束：保持原意不编造、STAR法则、中文输出技术栈保留英文。\n项目:${itemLabel} 角色:${context.role||''} 技术栈:${(context.techStack||[]).join(',')}\n原文:${originalText}\n\n输出格式：**润色后：** 然后换行，用 > 引用润色后文本。不要其他内容。`
      : `润色以下工作经历描述。\n约束：保持原意不编造、行动动词开头(主导/设计/实现/优化)、突出贡献与影响力、中文技术术语保留英文。\n职位:${context.role||''} 公司:${context.company||''}\n原文:${originalText}\n\n输出格式：**润色后：** 然后换行，用 > 引用润色后文本。不要其他内容。`

    // 写临时文件，通过 stdin 管道输入，避免 Windows 命令行 GBK 编码问题
    const tmpFile = path.join(os.tmpdir(), `jobmirror-polish-${Date.now()}.txt`)
    fs.writeFileSync(tmpFile, prompt, 'utf-8')

    try {
      // cmd.exe + chcp 65001 保证 UTF-8，管道传 prompt 文件到 claude
      const cmd = `chcp 65001 > nul && type "${tmpFile}" | claude -p --bare --output-format text 2>&1`
      const raw = execSync(cmd, {
        timeout: 120000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        windowsHide: true
      })

      // 提取策略：取 Claude 输出中第一个有实质内容的 > 引用行
      let polished = raw.trim().replace(/^Active code page:\s*\d+\s*/i, '').trim()

      const quoteLines = polished.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('>'))
        .map(l => l.replace(/^>\s*/, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').trim())
        .filter(l => l.length >= 10 && !l.startsWith('原文') && !l.startsWith('约束'))

      if (quoteLines.length > 0) polished = quoteLines[0]
      else polished = ''

      if (!polished || polished === originalText) return { ok: false, error: '润色未产生变化' }
      return { ok: true, polishedText: polished }
    } catch (e) {
      return { ok: false, error: (e.stderr || e.message || '润色失败').slice(0, 200) }
    } finally {
      try { fs.unlinkSync(tmpFile) } catch {}
    }
  }
}

http.createServer((req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': getOrigin(req),
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    try {
      // 精确匹配路由
      const key = `${req.method} ${url.pathname}`
      if (routes[key]) return json(res, req, routes[key](body ? JSON.parse(body) : null))

      // 带 :id 参数的路由匹配
      for (const [rk, fn] of Object.entries(routes)) {
        const [m, p] = rk.split(' ')
        if (m !== req.method || !p.includes(':id')) continue
        const regex = new RegExp('^' + p.replace(':id', '([^/]+)') + '$')
        const match = url.pathname.match(regex)
        if (match) return json(res, req, fn(body ? JSON.parse(body) : null, decodeURIComponent(match[1])))
      }

      json(res, req, { error: 'Not found' }, 404)
    } catch (e) {
      json(res, req, { error: e.message }, 500)
    }
  })
}).listen(PORT, () => {
  console.log(`职镜文件服务已启动: http://localhost:${PORT}`)
  console.log(`数据目录: ${ROOT}`)
})
