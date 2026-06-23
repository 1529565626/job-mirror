# 职镜 (JobMirror) · 项目规范

## 项目定位
AI 简历分析 + JD 技能对标 Skill（Claude Code Skill 形态），核心差异化：100% 本地运行 + 完全开源 + 技能差距→学习建议闭环。

## 技术方向（技术奠基阶段已确认）
- 分析引擎：Claude Code SKILL.md（纯指令集，非 MCP Server）—— Claude 直接执行简历解析 + JD 对标 + 报告生成
- 数据桥接：本地 JSON 文件系统（`~/.jobmirror/`），Claude Skill 和 Vue SPA 的唯一交集
- 交互看板：Vue 3 SPA（Vite 构建），浏览器中查看报告、拖拽上传简历、粘贴 JD
- 中间层：Node.js 轻量文件服务（~60 行，零依赖），为 Vue 提供 HTTP API 读写本地 JSON
- 文件提取：前端 pdfjs-dist(PDF) + mammoth(DOCX) 提取文本，浏览器端完成，不上传
- 远期：核心分析能力可复用到 Web 应用（Next.js）或小程序

## 目录约定

```
cani/                              # 项目根目录（产品名: 职镜 / JobMirror）
├── skill/                         # Claude Code Skill 封装
│   └── SKILL.md                   # Skill 指令集（Claude Code 读取此文件执行分析）
├── web/                           # Vue 3 SPA 前端
│   ├── index.html                 # HTML 入口
│   ├── package.json               # 前端依赖（vue, vue-router, pinia, vite）
│   ├── vite.config.js             # Vite 配置（含 /api 代理到文件服务）
│   └── src/
│       ├── main.js                # 应用入口：挂载 Vue + Router + Pinia
│       ├── App.vue                # 根组件
│       ├── router/
│       │   └── index.js           # 路由配置（3 个一级路由，5 个条目）
│       ├── stores/
│       │   ├── profile.js         # 用户档案 Pinia store
│       │   ├── jds.js             # 岗位列表 Pinia store
│       │   └── reports.js         # 分析报告 Pinia store
│       ├── services/
│       │   └── api.js             # HTTP 请求封装（fetch，~18 行）
│       ├── pages/
│       │   ├── ProfilePage.vue    # / — 个人档案看板
│       │   ├── JDPage.vue         # /jobs — 岗位列表
│       │   └── ReportsPage.vue    # /reports — 报告列表
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.vue  # 全局布局（侧栏 + 内容区）
│       │   │   └── SideNav.vue    # 左侧导航
│       │   ├── profile/
│       │   │   ├── BasicInfo.vue
│       │   │   ├── SkillList.vue
│       │   │   ├── SkillItem.vue
│       │   │   ├── ExperienceList.vue
│       │   │   ├── ExperienceItem.vue
│       │   │   ├── EducationList.vue
│       │   │   └── EducationItem.vue
│       │   ├── jd/
│       │   │   ├── JDList.vue
│       │   │   ├── JDItem.vue
│       │   │   └── JDDetail.vue
│       │   ├── report/
│       │   │   ├── ReportList.vue
│       │   │   ├── ReportItem.vue
│       │   │   ├── ReportDetail.vue
│       │   │   ├── MatchScore.vue     # SVG 环形匹配度图
│       │   │   ├── SkillGapChart.vue  # SVG 技能雷达图
│       │   │   ├── GapBreakdown.vue   # 技能差距逐项分析
│       │   │   └── Suggestions.vue    # 简历修改建议列表
│       │   └── shared/
│       │       ├── LoadingSpinner.vue
│       │       ├── EmptyState.vue
│       │       ├── ErrorState.vue
│       │       └── ProgressBar.vue
│       └── styles/
│           ├── variables.css      # CSS 自定义属性（颜色/间距/字号）
│           ├── reset.css          # 简易 CSS Reset
│           └── global.css         # 全局排版样式
├── server.js                      # Node.js 文件服务（~60 行，零依赖，端口 3099）
├── docs/                          # 文档
│   ├── market-research.md         # 市场调研报告
│   ├── feasibility.md             # 商业可行性分析
│   ├── architecture.md            # 系统架构设计
│   ├── data-model.md              # 数据模型设计
│   ├── skill-design.md            # Skill 封装设计
│   └── frontend-arch.md           # 前端架构设计
├── 简历助手功能要求.md              # 原始需求（项目根目录）
├── CLAUDE.md                      # 本文件 — 项目规范与协作指南
└── PROJECT_STATUS.md              # 项目进度跟踪
```

### 用户数据目录（运行时，独立于项目）

```
~/.jobmirror/                      # 所有持久化数据
├── profile.json                   # 用户技能档案
├── inbox/                         # 简历收件箱（Vue 拖拽上传暂存）
│   ├── resume.txt                 # 提取的简历纯文本
│   └── .processed                 # Claude 解析完成后标记
├── jds/                           # 岗位描述
│   └── <YYYY-MM-DD>-<slug>.json
├── reports/                       # 分析报告
│   └── <YYYY-MM-DD>-<slug>.json
└── settings.json                  # 应用设置（可选）
```

## 当前阶段
技术奠基阶段 — 已完成。产出物:
- `docs/architecture.md` — 系统架构设计（Claude Code Skill ↔ 本地 JSON ↔ Vue SPA）
- `docs/data-model.md` — 数据模型设计（profile / JD / 报告 / 目录布局）
- `docs/skill-design.md` — Skill 封装设计（SKILL.md 完整草案 + 6 个工作流 + 评分算法）
- `docs/frontend-arch.md` — 前端架构设计（组件树 / Pinia stores / 文件服务实现 / Vite 配置）
- `CLAUDE.md` — 已更新目录约定和技术方向

下一步：脚手架搭建（初始化 web/ 目录、编写 package.json、创建占位组件、实现 server.js）。

## 沟通规范
- 中文优先
- 分析报告使用 Markdown 格式
- 记忆文件独立于报告，互不冲突
