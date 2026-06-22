# 职镜 (JobMirror) · 前端架构设计

> 版本: v1.0 | 日期: 2026-06-16 | 作者: Coder Agent
> 阶段: 技术奠基 — 前端架构

---

## 1. 技术栈与选型理由

| 层面 | 选型 | 版本 | 理由 |
|:---|:---|:---|:---|
| 框架 | Vue 3 | 3.4+ | 用户指定；Composition API 更利于逻辑复用 |
| 构建 | Vite | 5.x | Vue 官方推荐，HMR 极快，配置简洁 |
| 路由 | Vue Router | 4.x | SPA 标配，3 个路由无需复杂配置 |
| 状态管理 | Pinia | 2.x | DevTools 支持好，TypeScript 友好（为后续 TS 迁移预留），比 provide/inject 更可预测 |
| HTTP | fetch (原生) | — | 零依赖，浏览器内置 |
| 样式 | CSS Variables + Scoped CSS | — | 零依赖，支持主题切换，Scoped 避免污染 |
| 图标 | 内联 SVG | — | 不引入图标库，6-8 个图标手写 SVG |
| 图表 | 原生 SVG | — | 仅需环形图和简易雷达图，各约 50-80 行 SVG 代码 |
| 类型检查 | JSDoc 注释 | — | MVP 阶段不引入 TypeScript，降低初始复杂度 |

### 不引入的依赖（及原因）

| 常见依赖 | 不引入的原因 |
|:---|:---|
| Element Plus / Naive UI | 组件数量极少（~12 个），引入 UI 库性价比低，且增加用户 npm install 负担 |
| ECharts / Chart.js | 只需 2 种简单图表，引入图表库是浪费（ECharts gzip 后仍 ~300KB） |
| Axios | fetch 原生支持，2-3 个 API 调用无需封装层 |
| Tailwind CSS | 项目规模小，手写 CSS Variables 更直观，减少构建依赖 |
| TypeScript | MVP 阶段用 JSDoc 做类型标注，后续迁移成本低 |

---

## 2. 项目目录结构

```
jobmirror/
├── skill/
│   └── SKILL.md              # Claude Code Skill 定义
├── web/                       # Vue 3 SPA 前端项目
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── libs/                          # 第三方库（CDN 引入或 npm 按需加载）
│   │   ├── pdf.min.js             # PDF.js 文本提取（~80KB gzip）
│   │   └── mammoth.browser.min.js # DOCX 文本提取（~60KB gzip）
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.js            # 应用入口，挂载 Vue + Router + Pinia
│       ├── App.vue            # 根组件
│       ├── router/
│       │   └── index.js       # 路由配置
│       ├── stores/
│       │   ├── profile.js     # 用户档案 Pinia store
│       │   ├── jds.js         # 岗位列表 Pinia store
│       │   └── reports.js     # 报告 Pinia store
│       ├── services/
│       │   ├── api.js         # HTTP 请求封装（~30 行 fetch 包装）
│       │   └── extractor.js   # 文件文本提取器（pdf/docx/md/txt 统一入口 ~40 行）
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.vue    # 全局布局（侧栏 + 内容区）
│       │   │   └── SideNav.vue      # 左侧导航
│       │   ├── profile/
│       │   │   ├── BasicInfo.vue    # 基本信息卡片
│       │   │   ├── SkillList.vue    # 技能列表
│       │   │   ├── SkillItem.vue    # 单条技能（含熟练度进度条）
│       │   │   ├── ExperienceList.vue
│       │   │   ├── ExperienceItem.vue
│       │   │   ├── EducationList.vue
│       │   │   └── EducationItem.vue
│       │   ├── jd/
│       │   │   ├── JDList.vue       # 岗位列表
│       │   │   ├── JDItem.vue       # 岗位卡片
│       │   │   ├── JDDetail.vue     # 岗位详情
│       │   │   └── JDInputForm.vue  # 新增粘贴 JD 表单（含保存+生成报告按钮）
│       │   ├── report/
│       │   │   ├── ReportList.vue   # 报告列表
│       │   │   ├── ReportItem.vue   # 报告摘要卡片
│       │   │   ├── ReportDetail.vue # 报告详情容器
│       │   │   ├── MatchScore.vue   # 综合匹配度环形图
│       │   │   ├── SkillGapChart.vue# 技能差距雷达图
│       │   │   ├── GapBreakdown.vue # 差距逐项分析列表
│       │   │   └── Suggestions.vue  # 简历修改建议列表
│       │   ├── onboarding/          # 新增：首次初始化流程
│       │   │   ├── DragDropZone.vue # 拖拽上传区域（PDF/DOCX/MD/TXT）
│       │   │   ├── FilePreview.vue  # 提取文本预览 + 确认
│       │   │   └── InitGuide.vue    # 初始化引导步骤条
│       │   └── shared/
│       │       ├── LoadingSpinner.vue  # 加载态
│       │       ├── EmptyState.vue      # 空态（可配置图标+文案）
│       │       ├── ErrorState.vue      # 错误态（可重试）
│       │       └── ProgressBar.vue     # 通用进度条
│       ├── pages/
│       │   ├── OnboardingPage.vue  # 新增：/init — 首次初始化页（拖拽简历）
│       │   ├── ProfilePage.vue
│       │   ├── JDPage.vue
│       │   └── ReportsPage.vue
│       └── styles/
│           ├── variables.css   # CSS 自定义属性（颜色、间距、字号）
│           ├── reset.css       # 简易 CSS Reset
│           └── global.css      # 全局排版样式
├── server.js                   # Node.js 文件服务（~50 行，项目根目录）
├── docs/                       # 文档
├── CLAUDE.md
└── PROJECT_STATUS.md
```

---

## 3. 路由设计

### 3.1 路由表

```js
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/init',
    name: 'onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { title: '初始化', icon: 'sparkles' }
  },
  {
    path: '/',
    name: 'profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { title: '个人档案', icon: 'user' }
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import('@/pages/JDPage.vue'),
    meta: { title: '岗位管理', icon: 'briefcase' }
  },
  {
    path: '/jobs/:id',
    name: 'jd-detail',
    component: () => import('@/components/jd/JDDetail.vue'),
    meta: { title: '岗位详情' }
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/pages/ReportsPage.vue'),
    meta: { title: '分析报告', icon: 'chart' }
  },
  {
    path: '/reports/:id',
    name: 'report-detail',
    component: () => import('@/components/report/ReportDetail.vue'),
    meta: { title: '报告详情' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

### 3.2 路由入口判断

应用启动时（App.vue 或 main.js），首先检查 `GET /api/profile` 是否存在且非空。若 `isEmpty` → 自动跳转 `/init`；否则跳转 `/`（档案页）。

```js
// 入口逻辑
const profile = await api.get('/api/profile')
if (Object.keys(profile.basic || {}).length === 0 && profile.skills?.length === 0) {
  router.push('/init')
}
```

后续用户可在侧栏手动进入 `/init` 更新简历；初始化完成后 `/init` 仍可访问（用于重新导入/覆盖档案）。

### 3.2 路由导航流程

```
/ （默认页 = 档案页）
├── /jobs         岗位列表
│   └── /jobs/:id  岗位详情（侧边面板或独立页）
├── /reports      报告列表
│   └── /reports/:id  报告详情（核心页面，最复杂）
└── 404 → 重定向到 /
```

3 个一级路由，5 个路由条目，配置极简。

### 3.3 布局结构

```
┌──────────────────────────────────────────────┐
│  AppLayout                                    │
│  ┌─────────┬────────────────────────────────┐ │
│  │         │                                │ │
│  │ SideNav │        <RouterView>            │ │
│  │         │                                │ │
│  │ 📋 档案  │   页面内容区                    │ │
│  │ 💼 岗位  │                                │ │
│  │ 📊 报告  │                                │ │
│  │         │                                │ │
│  │         │                                │ │
│  └─────────┴────────────────────────────────┘ │
└──────────────────────────────────────────────┘

SideNav: 固定宽度 200px，左侧垂直排列
内容区: 剩余宽度，padding 32px，白色背景
```

---

## 4. 组件设计

### 4.1 页面组件 × 4

#### OnboardingPage.vue — 首次初始化页

**路径**: `/init`
**职责**: 拖拽简历文件 → 提取文本 → 写入收件箱 → 引导用户触发 Claude 解析 → 确认后跳转档案页。

**状态覆盖**:

| 状态 | 触发条件 | UI 表现 |
|:---|:---|:---|
| 空（默认） | 首次访问 `/init` | `<InitGuide>` 步骤条 + `<DragDropZone>` 拖拽区 |
| 文件拖入 | 用户拖拽 PDF/DOCX/MD/TXT | 拖拽区高亮 + 文件名校验 |
| 提取中 | 前端调用 extractor 解析文本 | `<LoadingSpinner>` "正在提取文本..." |
| 预览 | 文本提取成功 | `<FilePreview>` 显示提取内容 + "确认导入"按钮 |
| 写入中 | 用户点击确认 | 调用 `PUT /api/inbox/resume` 写入原始文本到收件箱 |
| 写入完成 | 收件箱已就绪 | 弹窗显示终端命令 `用职镜导入收件箱` + "已复制到剪贴板" |
| 解析检测 | 轮询 `GET /api/inbox/status` | "等待 Claude 解析..." → 检测到 profile.json 更新后自动跳转 `/` |
| 格式不支持 | 用户拖拽了 .png 等非文本文件 | `<ErrorState>` "不支持的文件格式，请使用 PDF/DOCX/MD/TXT" |
| 提取失败 | PDF 为扫描件/加密 | `<ErrorState>` "无法提取文本，请使用纯文本/Markdown 格式" |

**组件构成**:
```
OnboardingPage.vue
├── InitGuide.vue         # 3 步引导: ①拖拽简历 → ②确认信息 → ③终端解析
├── DragDropZone.vue       # 拖拽区域，支持 click 选择文件
└── FilePreview.vue        # 提取文本预览 + 确认/重选按钮
```

**技术实现**:
- `DragDropZone.vue`: 监听 `dragenter/dragover/drop` 事件，样式高亮，文件类型校验（白名单：`.pdf .docx .md .txt`）
- `services/extractor.js`: 封装文件读取逻辑
  - PDF → `pdfjs-dist` 提取文本
  - DOCX → `mammoth` 提取文本
  - MD/TXT → `FileReader.readAsText()` 直接读取
  - 返回统一的 `{ text, fileName, fileType, charCount }` 结构
- file 读取全部在浏览器端完成，不上传

**数据流**:
```
用户拖拽文件
  → extractor.js 提取纯文本
  → api.put('/api/inbox/resume', { rawText, fileName })
  → server.js 写入 ~/.jobmirror/inbox/resume.txt
  → 前端弹窗提示终端命令
  → 用户切到终端执行 Claude Skill 工作流 0（收件箱导入）
  → 前端轮询 GET /api/inbox/status → 检测 processed=true
  → 自动跳转 / （档案页）
```

---

#### ProfilePage.vue

**职责**: 组装档案页面的各个板块。

**状态覆盖**:
| 状态 | 触发条件 | UI 表现 |
|:---|:---|:---|
| 加载中 | 首次请求 profile 数据 | `<LoadingSpinner>` 居中 |
| 空档案 | profile.json 不存在或 skills/experiences/education 全空 | `<EmptyState>` 提示"还没有档案，请在 Claude Code 中说'用职镜导入简历'" |
| 有数据 | 正常加载 | 渲染全部分块 |
| 加载失败 | 文件服务未启动或文件损坏 | `<ErrorState>` 含"重试"按钮和"启动文件服务"提示 |

**数据依赖**: Pinia `profile` store → `GET /api/profile`

---

#### JDPage.vue

**职责**: 展示已保存的岗位列表 + 录入新 JD。

**状态覆盖**:
| 状态 | UI |
|:---|:---|
| 加载中 | 骨架卡片 ×3 |
| 空列表 | `<EmptyState>` 图标=公文包，文案="还没有保存岗位" |
| 有岗位 | 卡片网格（2 列），每张卡片显示: 岗位名称、公司、保存时间、关联报告数 |
| 录入模式 | `<JDInputForm>` 展开在列表顶部：大文本框（粘贴 JD）+ 保存按钮 + 生成报告按钮 |
| 加载失败 | `<ErrorState>` |

**JDInputForm 交互**:
```
┌─────────────────────────────────────┐
│  粘贴岗位描述 (Job Description)      │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │  (粘贴 JD 全文...)             │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  [💾 保存岗位]    [🔍 生成分析报告]    │
│  ─────────────────────────────────  │
│  💡 点击"生成分析报告"后会弹出        │
│     终端命令，请在 Claude Code 中执行  │
└─────────────────────────────────────┘
```

**点击「保存岗位」流程**:
1. `POST /api/jds` 创建 JD 文件（rawText 有值，parsed=null）
2. 刷新 JD 列表 → 新卡片出现

**点击「生成分析报告」流程**:
1. 先自动执行「保存岗位」（如果内容已变更）
2. 弹窗显示终端命令，附"复制"按钮：
   ```
   请打开终端执行:
   claude "用职镜分析刚保存的岗位: <jd_id>"
   ```
3. 弹窗底部提示："报告生成后刷新此页面即可查看"
4. 可选：前端轮询 `/api/reports` 检测新报告，自动跳转（P1 优化）

---

#### ReportsPage.vue

**职责**: 展示分析报告列表。

**状态覆盖**:
| 状态 | UI |
|:---|:---|
| 加载中 | 骨架卡片 ×3 |
| 空列表 | `<EmptyState>` 图标=图表，文案="还没有分析报告，在 Claude Code 中粘贴 JD 开始分析" |
| 有报告 | 卡片列表，按时间倒序，每张卡片显示: 岗位名称、匹配度(颜色编码)、生成时间、关键差距数 |
| 加载失败 | `<ErrorState>` |

**数据依赖**: Pinia `reports` store → `GET /api/reports`

**交互**:
- 点击卡片 → 跳转 `/reports/:id`
- 删除按钮 → `DELETE /api/reports/:id` → 刷新列表

---

### 4.2 核心业务组件

#### MatchScore.vue — 环形匹配度图

**输入 props**:
```js
{
  score: Number,      // 0-100
  size: { default: 160 }  // SVG 画布大小
}
```

**实现**: SVG `<circle>` 配合 `stroke-dasharray` 实现环形进度。颜色按分段:
- 0-39: 红色 `#e74c3c`
- 40-59: 橙色 `#f39c12`
- 60-79: 蓝色 `#3498db`
- 80-100: 绿色 `#27ae60`

```
     ┌──────────┐
     │    ╭─╮    │
     │   ╱   ╲   │
     │  │  72% │  │
     │   ╲   ╱   │
     │    ╰─╯    │
     │  综合匹配度 │
     └──────────┘
```

---

#### SkillGapChart.vue — 简易雷达图

**输入 props**:
```js
{
  skills: Array<{ name: String, userScore: Number(0-5), jdScore: Number(0-5) }>
}
```

**实现**: SVG 多边形雷达图，最多展示 6-8 个技能维度。两条折线叠加（用户=蓝色，JD要求=灰色虚线），差距区域用半透明红色填充。

参考 data-model.md 中的 `skillAnalysis` 数组映射: 将 matched/partial/missing 映射为 5/3/0 分值，在雷达图上直观展示差距。

---

#### GapBreakdown.vue — 技能差距列表

**输入 props**:
```js
{
  analysis: Array  // skillAnalysis 数组
}
```

**实现**: 按 match 状态分组展示:
1. 缺失技能 (missing) — 红色标记，展开学习建议
2. 部分匹配 (partial) — 橙色标记
3. 完全匹配 (matched) — 绿色标记，默认折叠

每个 missing/partial 项展开后可看到 `learningAdvice` 的详细学习计划。

---

#### Suggestions.vue — 简历修改建议

**输入 props**:
```js
{
  suggestions: Array  // resumeSuggestions 数组
}
```

**实现**: 按 priority 排序（high→low），每条建议显示:
- 优先级标签（红/黄/灰）
- 针对的简历板块
- 当前问题描述
- 具体修改建议（引用原文对比）
- 修改原因（关联 JD 具体要求）

---

### 4.3 共享组件

| 组件 | 用途 | Props |
|:---|:---|:---|
| `LoadingSpinner` | 全局加载态 | `text: String` |
| `EmptyState` | 空数据提示 | `icon: String, title: String, description: String, actionText: String, actionLink: String` |
| `ErrorState` | 错误态 + 重试 | `message: String, retry: Function` |
| `ProgressBar` | 技能熟练度条 | `value: Number(0-100), label: String, color: String` |

---

## 5. 状态管理 (Pinia Stores)

### 5.1 profile store

```js
// stores/profile.js
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    data: null,        // profile.json 的完整内容
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => !state.data || (
      state.data.skills.length === 0 &&
      state.data.experiences.length === 0 &&
      state.data.education.length === 0
    ),

    skillCount: (state) => state.data?.skills?.length || 0,

    // 按熟练度分组的技能列表，供雷达图等使用
    skillsByCategory: (state) => {
      if (!state.data?.skills) return {}
      return state.data.skills.reduce((acc, s) => {
        (acc[s.category] ||= []).push(s)
        return acc
      }, {})
    }
  },

  actions: {
    async fetch() {
      this.loading = true
      this.error = null
      try {
        this.data = await api.get('/api/profile')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
})
```

### 5.2 jds store

```js
// stores/jds.js
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useJDsStore = defineStore('jds', {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => state.list.length === 0,
    count: (state) => state.list.length
  },

  actions: {
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        this.list = await api.get('/api/jds')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id) {
      this.loading = true
      try {
        this.current = await api.get(`/api/jds/${id}`)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async remove(id) {
      await api.delete(`/api/jds/${id}`)
      this.list = this.list.filter(j => j.id !== id)
    }
  }
})
```

### 5.3 reports store

```js
// stores/reports.js
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useReportsStore = defineStore('reports', {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => state.list.length === 0,
    latest: (state) => state.list[0] || null,

    // 按匹配度分组的计数
    scoreDistribution: (state) => ({
      high: state.list.filter(r => r.overallScore >= 80).length,
      medium: state.list.filter(r => r.overallScore >= 50 && r.overallScore < 80).length,
      low: state.list.filter(r => r.overallScore < 50).length
    })
  },

  actions: {
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        this.list = await api.get('/api/reports')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id) {
      this.loading = true
      try {
        this.current = await api.get(`/api/reports/${id}`)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async remove(id) {
      await api.delete(`/api/reports/${id}`)
      this.list = this.list.filter(r => r.id !== id)
    }
  }
})
```

---

## 6. API 服务层

### 6.1 api.js — fetch 封装

```js
// services/api.js
const BASE_URL = 'http://localhost:3099'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, opts)

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Unknown error')
    throw new Error(`[${res.status}] ${msg}`)
  }

  return res.json()
}

export const api = {
  get: (path) => request('GET', path),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path)
}
```

总共 **18 行**，无外部依赖。覆盖了前端需要的全部 HTTP 方法。

---

## 7. Node.js 文件服务实现

### 7.1 设计原则

- **零依赖**: 只用 Node.js 内置模块（`http`, `fs`, `path`, `os`）
- **单文件**: `server.js`，放在项目根目录
- **纯透传**: 不做数据验证、不做业务逻辑、不做用户认证
- **代码量**: 目标 60 行以内

### 7.2 完整实现

```js
// server.js — 职镜本地文件服务
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.jobmirror')
const PORT = 3099

// 确保数据目录存在
fs.mkdirSync(path.join(ROOT, 'jds'), { recursive: true })
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true })

function read(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null } }
function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

function list(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const d = read(path.join(dir, f))
        return { id: f.replace('.json', ''), ...(d ? { createdAt: d.createdAt, title: d.parsed?.title || d.id, overallScore: d.match?.overallScore } : {}) }
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  } catch { return [] }
}

const routes = {
  'GET /api/profile': () => read(path.join(ROOT, 'profile.json')) || {},
  'PUT /api/profile': (body) => { fs.writeFileSync(path.join(ROOT, 'profile.json'), JSON.stringify(body, null, 2)); return { ok: true } },
  'GET /api/jds': () => list(path.join(ROOT, 'jds')),
  'GET /api/jds/:id': (_, id) => read(path.join(ROOT, 'jds', id + '.json')) || null,
  'DELETE /api/jds/:id': (_, id) => { fs.unlinkSync(path.join(ROOT, 'jds', id + '.json')); return { ok: true } },
  'GET /api/reports': () => list(path.join(ROOT, 'reports')),
  'GET /api/reports/:id': (_, id) => read(path.join(ROOT, 'reports', id + '.json')) || null,
  'DELETE /api/reports/:id': (_, id) => { fs.unlinkSync(path.join(ROOT, 'reports', id + '.json')); return { ok: true } },
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    try {
      // 尝试直接匹配路由
      const key = `${req.method} ${url.pathname}`
      if (routes[key]) return json(res, routes[key](body ? JSON.parse(body) : null))

      // 尝试带 :id 参数的路由匹配
      for (const [rk, fn] of Object.entries(routes)) {
        const [m, p] = rk.split(' ')
        if (m !== req.method || !p.includes(':id')) continue
        const regex = new RegExp('^' + p.replace(':id', '([^/]+)') + '$')
        const match = url.pathname.match(regex)
        if (match) return json(res, fn(body ? JSON.parse(body) : null, match[1]))
      }

      json(res, { error: 'Not found' }, 404)
    } catch (e) {
      json(res, { error: e.message }, 500)
    }
  })
}).listen(PORT, () => {
  console.log(`职镜文件服务已启动: http://localhost:${PORT}`)
  console.log(`数据目录: ${ROOT}`)
})
```

**代码量**: 约 60 行（含空行），零 npm 依赖。

### 7.3 路由匹配说明

文件服务使用简单的字符串匹配 + 正则参数化，不需要 Express 的路由系统:

| 请求 | 匹配方式 | 文件操作 |
|:---|:---|:---|
| `GET /api/profile` | 精确匹配 | `readFile(ROOT/profile.json)` |
| `PUT /api/profile` | 精确匹配 | `writeFile(ROOT/profile.json, body)` |
| `GET /api/jds` | 精确匹配 | `readdir(ROOT/jds/)` + 逐文件读取摘要 |
| `GET /api/jds/xxx` | `:id` 正则 | `readFile(ROOT/jds/xxx.json)` |
| `DELETE /api/jds/xxx` | `:id` 正则 | `unlink(ROOT/jds/xxx.json)` |

---

## 8. Vite 配置

```js
// web/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3099'  // 开发环境代理到文件服务
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

---

## 9. 样式系统

### 9.1 CSS Variables 主题定义

```css
/* web/src/styles/variables.css */
:root {
  /* 颜色 */
  --color-primary: #2563eb;
  --color-primary-light: #3b82f6;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* 字号 */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}

/* 暗色主题（预留，MVP 不实现切换 UI） */
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-text: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
}
```

### 9.2 匹配度颜色工具类

```css
.score-high    { color: var(--color-success); }  /* 80-100 */
.score-medium  { color: var(--color-primary); }  /* 50-79  */
.score-low     { color: var(--color-warning); }  /* 30-49  */
.score-critical { color: var(--color-danger); }  /* 0-29   */
```

---

## 10. 开发与运行流程

### 10.1 开发环境

```bash
# 终端 1: 启动文件服务
node server.js
# → 职镜文件服务已启动: http://localhost:3099

# 终端 2: 启动 Vue 开发服务器
cd web && npm run dev
# → Vite dev server: http://localhost:5173
```

Vite 的 proxy 配置自动将 `/api/*` 请求转发到 `localhost:3099`，开发时无需处理跨域。

### 10.2 生产模式

```bash
# 构建 Vue SPA
cd web && npm run build    # 产出 web/dist/

# 文件服务托管静态文件（需修改 server.js 增加静态文件服务）
node server.js
# → 访问 http://localhost:3099 即可使用
```

生产模式下，修改 `server.js` 增加静态文件托管逻辑（约 10 行），让文件服务同时服务 `web/dist/` 目录的静态资源。用户在浏览器中打开 `http://localhost:3099` 即可使用完整应用。

### 10.3 不依赖 Node.js 的备选方案

如果用户不想运行 Node.js 文件服务，Vue SPA 也可以直接读取 `~/.jobmirror/`：

- **方案 B**: 构建时将 JSON 数据嵌入 HTML（需提前运行一个构建脚本）
- **方案 C**: 使用 Vite 的 `import.meta.glob` 在构建时导入 JSON（但路径固定，不够灵活）

当前方案 A（Node.js 文件服务）是最灵活且开发体验最好的选择。

---

## 11. 各页面状态覆盖检查清单

| 页面 | 加载中 | 空数据 | 正常数据 | 错误 | 备注 |
|:---|:---|:---|:---|:---|:---|
| ProfilePage | Spinner | "还没有档案" | 全板块渲染 | "无法加载档案" + 重试 | 含文件服务未启动的提示 |
| JDPage | 骨架卡片 | "还没有岗位" | 卡片网格 | "无法加载岗位" + 重试 | — |
| JDDetail | Spinner | 不适用（从列表进入） | 详情内容 | "岗位不存在或已删除" | 404 页面 |
| ReportsPage | 骨架卡片 | "还没有报告" | 卡片列表 | "无法加载报告" + 重试 | — |
| ReportDetail | Spinner | 不适用 | 全部4个板块 | "报告不存在或已删除" | 含 MatchScore/SkillGap/GapBreakdown/Suggestions |

---

> **下一步**: 更新 CLAUDE.md 中的目录约定，完成项目脚手架设计。
