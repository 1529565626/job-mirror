# 职镜 (JobMirror) · AI Agent 入口

> 当 Claude Code / Codex / OpenClaw 等 AI 工具进入此目录时，读取本文件了解项目并执行安装。

## AI Agent 安装指南

```
环境要求: Node.js >= 18, npm >= 9
安装命令:
  1. cd web && npm install          # 安装前端依赖
  2. node server.js &               # 后台启动文件服务 (端口 3099)
  3. cd web && npx vite --host &    # 后台启动开发服务器 (端口 5173)
注意: 两个服务需后台并行运行，不要在前台阻塞等待
访问地址: http://localhost:5173
数据目录: ~/.jobmirror/ (自动创建)
```

## 前置环境检测（安装前必须先执行）

AI Agent 进入项目后，**在执行任何安装命令之前**，必须逐项检测以下环境。每项输出 ✅/❌ 状态，全部通过再执行安装；有 ❌ 则先引导用户修复。

### 检测清单

| # | 检测项 | 检测命令 | 通过标准 | 失败时引导方案 |
|---|--------|----------|----------|----------------|
| 1 | Node.js 已安装 | `node --version` | 输出版本号 ≥ 18.0.0 | 引导用户访问 https://nodejs.org 下载 LTS 版本，Windows 用户推荐 .msi 安装包 |
| 2 | npm 可用 | `npm --version` | 输出版本号 ≥ 9.0.0 | 通常随 Node.js 自带；若缺失则在终端执行 `npm install -g npm@latest` |
| 3 | Git 已安装 | `git --version` | 输出版本号 | 引导用户访问 https://git-scm.com/download/win 下载安装，安装时勾选 "Git Bash" |
| 4 | 项目依赖目录存在 | 检查 `web/node_modules/` 是否存在 | 目录存在 | 若不存在，安装阶段执行 `cd web && npm install` 即可 |
| 5 | 端口 3099 未被占用 | Windows: `netstat -ano | findstr :3099`; Unix: `lsof -i :3099` | 无输出或仅本进程占用 | 若被占用，提示用户终止占用进程或修改 `server.js` 端口 |
| 6 | 端口 5173 未被占用 | Windows: `netstat -ano | findstr :5173`; Unix: `lsof -i :5173` | 无输出或仅本进程占用 | 若被占用，Vite 会自动尝试下一个端口，仅作警告 |
| 7 | npm 注册源可访问 | `npm ping` 或 `npm config get registry` | 无超时错误 | 若超时，引导设置国内镜像: `npm config set registry https://registry.npmmirror.com` |
| 8 | 磁盘可写 (~/.jobmirror/) | 尝试 `mkdir -p ~/.jobmirror` 并写入测试文件 | 创建+写入成功 | 检查用户目录权限，Windows 下确保 `%USERPROFILE%` 可写 |

### Windows 特别说明

- 优先使用 **Git Bash** 或 **PowerShell 7+** 执行命令，避免 CMD 下的兼容问题
- 若 `node` 命令在 CMD 中不可用，检查是否已添加到系统 PATH，或重启终端
- `~/.jobmirror/` 在 Windows 上对应 `%USERPROFILE%\.jobmirror\`，由 server.js 自动处理
- 若遇到 `ExecutionPolicy` 限制无法运行脚本，在 PowerShell(管理员) 中执行: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 执行流程

```
1. 逐项运行检测命令 → 记录每项状态
2. 全部 ✅ → 输出"环境检测通过，开始安装" → 执行安装指南中的 3 步
3. 存在 ❌ → 按"失败时引导方案"逐条告知用户如何修复 → 等待用户确认后重新检测
4. 安装完成后 → 验证两个服务是否正常启动 (curl http://localhost:5173)
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
