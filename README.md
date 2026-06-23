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

## 功能一览

| 模块 | 功能 |
|------|------|
| 🏠 个人档案 | 拖拽上传 PDF/DOCX 简历 → AI 自动解析 → 结构化技能档案 |
| 📋 岗位管理 | 粘贴 JD → 一键触发 AI 分析 → 生成对标报告 |
| 📊 分析报告 | 匹配度环形图 + 技能雷达图 + 逐项差距分析 + 修改建议 |
| ✏️ 简历编辑 | MD 编辑器 + 即时预览 + 三套模板 + HTML/MD/DOCX/PDF 导出 |
| ⇔ 岗位对比 | 勾选多个岗位 → 多维对比表（技能/经验/学历/缺口） |
| 📜 执行日志 | 每次 AI 分析的完整交互记录（调试模式） |

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9
- **Claude Code** CLI（用于 AI 分析引擎）

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

如果你使用 **Claude Code**，进入项目目录后 Claude 会自动读取 `CLAUDE.md` 并执行上述安装步骤。

如果你使用 **Codex**（OpenAI CLI）或 **OpenClaw**，告诉 AI：

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

1. **导入简历**：拖拽 PDF/DOCX 到个人档案页 → 前端提取文本 → 保存到 `~/.jobmirror/inbox/` → Claude Code 解析 → 生成结构化档案
2. **JD 分析**：粘贴岗位描述 → 自动触发 Claude Code 分析 → 5 步流水线（解析 JD → 技能对标 → 计算匹配度 → 生成报告 → 写入 JSON）
3. **查看报告**：环形匹配度图 + 技能雷达图 + 逐项差距 + 简历建议 + 面试准备
4. **编辑简历**：应用建议 → 即时预览 → 选择模板 → 导出 HTML/MD/DOCX/PDF

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Vue 3 + Pinia + Vue Router + Vite |
| 样式 | CSS 自定义属性 + Noto Sans/Serif SC |
| 中间层 | Node.js 内置模块 (http, fs, path, child_process) |
| AI 引擎 | Claude Code CLI + SKILL.md 指令集 |
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
