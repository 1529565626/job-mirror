// server.js — 职镜本地文件服务（零依赖，纯 Node.js 内置模块）
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const ROOT = path.join(os.homedir(), '.jobmirror')
const PORT = 3099
const ALLOW_ORIGIN = /^http:\/\/localhost:\d+$/

// 确保数据目录存在
;['inbox', 'jds', 'reports'].forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }))

// 工具函数
function read(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null } }
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

// 列表目录下的 JSON 文件摘要
function list(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const d = read(path.join(dir, f))
        const id = f.replace('.json', '')
        return { id, ...(d ? { createdAt: d.createdAt, title: d.parsed?.title || d.id, overallScore: d.match?.overallScore } : {}) }
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
    // 重建空目录
    ;['inbox', 'jds', 'reports'].forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }))
    return { ok: true }
  },

  // 岗位
  'GET /api/jds': () => list(path.join(ROOT, 'jds')),
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

  // 自动处理收件箱：调用 Claude CLI 解析简历
  'POST /api/inbox/process': () => {
    const resumePath = path.join(ROOT, 'inbox', 'resume.txt')
    if (!fs.existsSync(resumePath)) return { ok: false, error: '收件箱为空' }
    if (fs.existsSync(path.join(ROOT, 'inbox', '.processed'))) fs.unlinkSync(path.join(ROOT, 'inbox', '.processed'))

    const prompt = [
      '你正在运行职镜(JobMirror)的自动化导入流程。请按以下步骤操作，不要输出中间过程：',
      '',
      '1. 读取文件：' + resumePath,
      '2. 按照以下规则解析简历：',
      '   - 基本信息：提取行业、当前职位、工作年限、一句话总结',
      '   - 技能：逐项提取名称+分类+熟练度(5级：novice/intermediate/advanced/proficient/expert)+使用年限',
      '     分类枚举：编程语言/框架工具/数据分析/产品设计/运营市场/管理软技能/语言/其他',
      '     熟练度映射：精通/专家→proficient，熟练掌握/熟练→advanced，掌握/熟悉→intermediate，了解/入门→novice',
      '   - 工作经历：逐段提取公司/职位/起止时间(YYYY-MM)/核心职责描述/关键成果',
      '   - 项目经历：逐项提取项目名/角色/时间/描述/成果/技术栈',
      '   - 教育背景：逐条提取学校/学位/专业/毕业年份',
      '3. 如果 ~/.jobmirror/profile.json 已存在，按增量合并策略合并（技能去重取最高熟练度，经历追加去重），否则创建新文件',
      '4. 写入 ~/.jobmirror/profile.json（version:"1.0"，2空格缩进，UTF-8，更新updatedAt）',
      '5. 创建空文件 ~/.jobmirror/inbox/.processed',
      '6. 只输出"OK"表示完成，不要输出其他任何内容'
    ].join('\n')

    const tmpFile = path.join(os.tmpdir(), `jobmirror-import-${Date.now()}.txt`)
    fs.writeFileSync(tmpFile, prompt, 'utf-8')

    try {
      const cmd = `chcp 65001 > nul && type "${tmpFile}" | claude -p --bare --output-format text 2>&1`
      const raw = execSync(cmd, {
        timeout: 180000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        windowsHide: true
      })
      const output = raw.trim().replace(/^Active code page:\s*\d+\s*/i, '').trim()
      const ok = output.includes('OK') && fs.existsSync(path.join(ROOT, 'inbox', '.processed'))
      return ok ? { ok: true } : { ok: false, error: '导入未完成，请检查 Claude 输出', detail: output.slice(0, 500) }
    } catch (e) {
      try { fs.unlinkSync(tmpFile) } catch {}
      return { ok: false, error: (e.stderr || e.message || 'Claude CLI 调用失败').slice(0, 300) }
    }
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
