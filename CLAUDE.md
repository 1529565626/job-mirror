# 职镜 (JobMirror) · AI Agent 入口

> 当 Claude Code / Codex / OpenClaw 等 AI 工具进入此目录时，读取本文件了解项目并执行安装。

## AI Agent 安装指南

```
环境要求: Node.js >= 18, npm >= 9
安装命令:
  1. cd web && npm install          # 安装前端依赖
  2. node server.js                 # 启动文件服务 (端口 3099)
  3. cd web && npx vite --host      # 启动开发服务器 (端口 5173)
访问地址: http://localhost:5173
数据目录: ~/.jobmirror/ (自动创建)
```

## 项目结构

```
cani/                               # 职镜 / JobMirror
├── skill/SKILL.md                  # Claude Code Skill 指令集
├── server.js                       # Node.js 文件服务 (零依赖, 端口 3099)
├── web/                            # Vue 3 SPA 前端
│   ├── src/
│   │   ├── pages/                  # 5 页面
│   │   ├── components/             # layout/profile/jd/report/resume/shared
│   │   ├── stores/                 # profile, jds, reports, debug (Pinia)
│   │   ├── services/api.js         # HTTP 封装
│   │   └── utils/fileExtractor.js  # 浏览器端 PDF/DOCX 文本提取
│   └── package.json                # vue, pinia, vue-router, pdfjs-dist, mammoth, docx
├── docs/                           # 设计与调研文档
└── ~/.jobmirror/                   # 运行时用户数据 (独立于项目)
    ├── profile.json                # 技能档案
    ├── jds/                        # 岗位描述
    ├── reports/                    # 分析报告
    └── inbox/                      # 简历收件箱
```

## 项目定位

AI 简历分析 + JD 技能对标，100% 本地运行 + 完全开源 + 技能差距→学习建议闭环。

- 分析引擎：Claude Code SKILL.md（纯指令集，直接执行简历解析 + JD 对标 + 报告生成）
- 数据桥接：本地 JSON（`~/.jobmirror/`），Skill ↔ Vue SPA 唯一交集
- 交互看板：Vue 3 SPA，浏览器中查看报告、拖拽上传简历、粘贴 JD
- 中间层：Node.js 文件服务，零依赖，RESTful JSON API
- 文件提取：pdfjs-dist(PDF) + mammoth(DOCX)，浏览器端完成，不上传

## 沟通规范

- 中文优先
- 分析报告使用 Markdown 格式
- git push 前必须询问用户确认
