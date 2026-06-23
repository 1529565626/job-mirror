# 职镜 (JobMirror)

> 照见差距，以镜自省 — AI 简历分析 + JD 技能对标，100% 本地运行，完全开源。

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Vue](https://img.shields.io/badge/vue-3.x-4fc08d)](https://vuejs.org)

## 这是什么

职镜是一款 **AI 驱动的简历分析与岗位匹配工具**。上传简历、粘贴 JD，AI 自动解析并生成：

- 技能对标报告（matched / partial / missing 逐项分析）
- 三维匹配度评分（技能 × 经验 × 学历，含动态权重调整）
- 简历修改建议（Before/After 对比 + 一键应用）
- 面试准备包（STAR 故事模板 + 预测问题 + 差距应答策略）
- 多岗位横向对比表

**所有数据存储在本地，不上传任何服务器。**

## 核心：AI 提示词

本项目的心脏是一套 **结构化 AI 提示词体系**，所有文件均在仓库中：

| 文件 | 行数 | 用途 |
|------|------|------|
| `skill/SKILL.md` | 987 行 | Claude Code Skill 完整指令集 — 角色定义、数据模型、6 大工作流、中文简历解析规则、评分公式、边界场景处理 |
| `server.js` 内嵌 prompt | ~200 行 | JD 分析自包含 5 步流水线 — 解析 JD → 技能对标 → 计算匹配度 → 生成报告 → 写入 JSON |

`SKILL.md` 是给 **AI 看的操作手册**，涵盖：
- 中文简历 8 类板块识别 + 5 级熟练度映射 + 年限推算
- 关键词三分类体系（hard/soft/industry）
- 增量合并策略（4 组字段不同处理规则）
- 动态评分权重（应届生/转行/高管场景自适应）
- STAR 故事生成 + 高频面试题预测 + ATS 兼容检查

## 功能一览

| 模块 | 功能 |
|------|------|
| 🏠 个人档案 | 拖拽上传 PDF/DOCX 简历 → AI 自动解析 → 结构化技能档案 |
| 📋 岗位管理 | 粘贴 JD → 一键触发 AI 分析 → 生成对标报告 |
| 📊 分析报告 | 匹配度环形图 + 技能雷达图 + 逐项差距分析 + 修改建议 |
| ✏️ 简历编辑 | MD 编辑器 + 即时预览 + 三套模板 + HTML/MD/DOCX/PDF 导出 |
| ⇔ 岗位对比 | 勾选多个岗位 → 多维对比表（技能/经验/学历/缺口） |
| 📜 执行日志 | 每次 AI 分析的完整交互记录（调试模式开关） |

## 目录结构

```
job-mirror/
├── skill/
│   └── SKILL.md                        # ★ AI 提示词核心（987 行）
├── server.js                           # Node.js 文件服务 + JD 分析 prompt
├── web/                                # Vue 3 SPA 前端
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js                     # 应用入口
│       ├── App.vue
│       ├── router/index.js             # 6 条路由
│       ├── stores/                     # Pinia 状态管理
│       │   ├── profile.js              # 用户档案
│       │   ├── jds.js                  # 岗位列表
│       │   ├── reports.js              # 分析报告
│       │   └── debug.js                # 调试模式开关
│       ├── services/api.js             # HTTP 请求封装
│       ├── utils/fileExtractor.js      # PDF/DOCX/MD/TXT 文本提取
│       ├── pages/
│       │   ├── ProfilePage.vue         # / — 个人档案看板
│       │   ├── JDPage.vue              # /jobs — 岗位录入+分析
│       │   ├── ComparePage.vue         # /compare — 多岗位对比
│       │   ├── ReportsPage.vue         # /reports — 报告列表
│       │   └── LogsPage.vue            # /logs — 执行日志（调试模式）
│       ├── components/
│       │   ├── layout/                 # AppLayout, SideNav, SettingsPopup
│       │   ├── profile/                # 档案展示组件（9 个）
│       │   ├── jd/                     # 岗位组件（3 个）
│       │   ├── report/                 # 报告组件（11 个）
│       │   ├── resume/                 # 简历排版组件（7 个 + 1 CSS）
│       │   └── shared/                 # 通用组件（4 个）
│       └── styles/                     # 全局样式（variables, reset, global）
├── docs/                               # 设计文档
│   ├── architecture.md                 # 系统架构
│   ├── data-model.md                   # 数据模型
│   ├── skill-design.md                 # Skill 设计
│   └── frontend-arch.md                # 前端架构
├── CLAUDE.md                           # AI Agent 入口（安装指令）
├── README.md                           # 本文件
├── PROJECT_STATUS.md                   # 开发进度
└── LICENSE                             # MIT
```

## 快速开始

### 前置依赖

职镜的 AI 分析能力依赖外部 AI Agent 工具，使用前需先安装以下之一：

| 工具 | 说明 | 安装方式 |
|------|------|------|
| [**Claude Code**](https://docs.anthropic.com/en/docs/claude-code) | ⭐ 推荐 — SKILL.md 原生适配 | `npm install -g @anthropic-ai/claude-code` |
| [**Codex**](https://github.com/openai/codex) | OpenAI CLI，读取 CLAUDE.md | 参照官方文档 |
| [**OpenClaw**](https://github.com/openclaw/openclaw) | 通用 AI Agent，读取项目指令 | 参照官方文档 |

AI Agent 负责执行 `skill/SKILL.md` 中的简历解析、JD 对标、报告生成等分析任务。**未安装任何 AI Agent 时，职镜只能作为简历编辑器使用，无法进行 AI 分析。**

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/1529565626/job-mirror.git
cd job-mirror

# 2. 安装前端依赖
cd web && npm install

# 3. 启动文件服务（终端 1）
node server.js
# → 职镜文件服务已启动: http://localhost:3099

# 4. 启动开发服务器（终端 2）
cd web && npx vite --host
# → http://localhost:5173
```

浏览器打开 `http://localhost:5173` 即可使用。

### AI 自动安装

使用 **Claude Code**：进入项目目录，Claude 自动读取 `CLAUDE.md` 并执行安装。

使用 **Codex**（OpenAI CLI）或 **OpenClaw**：告诉 AI：

> "读取这个项目的 CLAUDE.md，按其中的安装步骤初始化项目"

## 架构

```
┌─────────────────────────────────────────────────┐
│  浏览器 (http://localhost:5173)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ 个人档案  │  │ 岗位管理  │  │ 分析报告+编辑 │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │             │               │           │
│       └─────────────┼───────────────┘           │
│                     │ fetch()                   │
└─────────────────────┼───────────────────────────┘
                      │ HTTP (localhost:3099)
┌─────────────────────┼───────────────────────────┐
│  server.js          │  Node.js 文件服务          │
│                     │  零依赖，纯内置模块         │
└─────────────────────┼───────────────────────────┘
                      │ fs.read/write
┌─────────────────────┼───────────────────────────┐
│  ~/.jobmirror/      │  本地 JSON 文件系统         │
│  ├── profile.json   │                           │
│  ├── jds/*.json     │                           │
│  └── reports/*.json │                           │
└─────────────────────┼───────────────────────────┘
                      │ spawn()
┌─────────────────────┼───────────────────────────┐
│  Claude Code CLI    │  AI 分析引擎               │
│  skill/SKILL.md     │  简历解析 + JD 对标         │
└─────────────────────┴───────────────────────────┘
```

## AI 分析工作流

1. **导入简历**：拖拽 PDF/DOCX → 前端提取文本 → 保存到 `~/.jobmirror/inbox/` → Claude Code 执行 `SKILL.md` 工作流 0/1 → 生成结构化档案
2. **JD 分析**：粘贴岗位描述 → server.js 启动 Claude Code → 5 步流水线（解析 JD → 技能对标 → 计算匹配度 → 生成报告 → 写入 JSON）
3. **查看报告**：环形匹配度图 + 技能雷达图 + 逐项差距 + 简历建议 + 面试准备
4. **编辑简历**：应用建议 → 即时预览 → 三套模板 → 导出

## 技术栈

| 层 | 技术 |
|------|------|
| AI 提示词 | Claude Code SKILL.md（987 行结构化指令） |
| 前端 | Vue 3 + Pinia + Vue Router + Vite |
| 样式 | CSS 自定义属性 + Noto Sans/Serif SC |
| 中间层 | Node.js 内置模块 (http, fs, path, child_process) |
| PDF 提取 | pdfjs-dist（浏览器端） |
| DOCX 提取 | mammoth（浏览器端） |
| DOCX 导出 | docx（Office Open XML） |

## 隐私

- **100% 本地运行**：简历和 JD 数据仅存储在 `~/.jobmirror/` 本地目录
- **不上传**：PDF/DOCX 提取在浏览器端完成，原始文件不离开本机
- **零云端依赖**：AI 分析通过本地 Claude Code CLI 执行

## 许可证

MIT License

## 项目状态

核心功能闭环已完成：简历导入 → JD 分析 → 报告生成 → 简历编辑 → 多岗位对比，全链路贯通。
