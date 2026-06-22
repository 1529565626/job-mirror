# 职镜 (JobMirror) · 系统架构设计

> 版本: v1.0 | 日期: 2026-06-16 | 作者: Coder Agent
> 阶段: 技术奠基 — 架构设计

---

## 1. 系统整体架构

```
                         用户
                          |
            ┌─────────────┼─────────────┐
            |             |             |
            ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ 提供简历  │  │ 粘贴 JD  │  │ 查看报告  │
     │ (文件/文本)│  │ (文本)    │  │ (浏览器)  │
     └────┬─────┘  └────┬─────┘  └────┬─────┘
          |             |             |
          ▼             ▼             ▲
   ┌────────────────────────────┐     |
   │     Claude Code Skill      │     |
   │     (SKILL.md 指令集)       │     |
   │                            │     |
   │  · 简历解析与结构化         │     |
   │  · JD 关键信息提取          │     |
   │  · 技能对标分析             │     |
   │  · 报告生成                 │     |
   │  · 面试准备建议             │     |
   └──────────┬─────────────────┘     |
              |                       |
              │ 读写                   │ HTTP (localhost)
              ▼                       |
   ┌──────────────────────┐           |
   │   ~/.jobmirror/       │           |
   │   本地 JSON 文件系统   │◄──────────┘
   │                      │
   │  · profile.json      │
   │  · jds/*.json        │
   │  · reports/*.json    │
   │  · settings.json     │
   └──────────┬───────────┘
              |
              │ HTTP API (localhost:3099)
              ▼
   ┌──────────────────────┐
   │  Node.js 文件服务     │
   │  (轻量中间层)         │
   │                      │
   │  · GET/POST/PUT/DEL  │
   │  · 纯文件 IO         │
   │  · 零业务逻辑         │
   │  · ~50 行代码         │
   └──────────┬───────────┘
              |
              │ 提供静态资源
              ▼
   ┌──────────────────────┐
   │  Vue 3 SPA           │
   │  (Vite 构建)          │
   │                      │
   │  · 档案看板           │
   │  · 岗位管理           │
   │  · 报告查看           │
   └──────────────────────┘
```

### 架构原则

1. **单一共享数据层**: `~/.jobmirror/` 是唯一的数据交集。Claude Code Skill 和 Vue SPA 通过文件系统解耦，互不调用。
2. **Claude 负责分析，Vue 负责展示**: 分析逻辑完全在 Claude Code Skill 中完成，Vue SPA 不做任何 AI 推理。
3. **文件服务是纯透传层**: Node.js 文件服务不做任何数据加工、验证、转换。它只暴露 HTTP API 读取/写入 JSON 文件。所有业务逻辑在 Claude Skill（分析）或 Vue SPA（展示逻辑）中。
4. **用户自行提供 LLM API Key**: Claude Code 本身需要 Anthropic API Key（由用户配置），Skill 不额外收费。

---

## 2. Claude Code Skill 工作机制

### 2.1 Skill 定位

职镜 Skill 是一个 Claude Code **Skill Pack**（SKILL.md 指令集），不是 MCP Server。两者关键区别：

| 维度 | SKILL.md (本项目) | MCP Server |
|:---|:---|:---|
| 运行方式 | Claude 读取指令后自行执行 | 独立进程，Claude 通过协议调用 |
| 复杂度 | 低，依赖 Claude 内置能力 | 高，需要独立部署和维护 |
| 文件操作 | Claude 自带文件读写工具 | MCP Server 需要自行实现 |
| 用户门槛 | 仅需安装 Claude Code | 需额外安装 Node/Python 运行时 |
| 适用场景 | 分析、生成类任务 | 外部 API 集成、复杂计算 |

**选择 SKILL.md 的理由**：本项目核心逻辑是"读简历 + 读 JD + 对标分析 + 写报告"，Claude 的 LLM 能力可以直接完成。不需要独立进程做向量化或 API 调用。降低用户安装门槛。

### 2.2 Skill 的 4 条核心指令

用户通过 Claude Code 命令行触发，例如：

```bash
# 导入简历
claude "用职镜导入我的简历 A:\my-resume.pdf"

# 分析岗位
claude "用职镜分析这个 JD: [粘贴岗位描述]"

# 查看技能档案
claude "用职镜看看我的技能档案"

# 查看报告
claude "用职镜展示最新一份分析报告"
```

Claude 读取 SKILL.md 后，执行流程如下：

```
用户指令 → Claude 解析意图
              │
    ┌─────────┼─────────┬──────────────┐
    ▼         ▼         ▼              ▼
 导入简历   分析岗位   查看档案       查看报告
    │         │         │              │
    ▼         ▼         ▼              ▼
 读取简历   读取 JD   读取            读取
 文件内容   文本内容   profile.json    report.json
    │         │         │              │
    ▼         ▼         ▼              ▼
 LLM 解析   读取      格式化输出      格式化输出
 结构化     profile.json              (终端)
    │         │
    ▼         ▼
 写入       LLM 对标分析
 profile.json   │
               ▼
            写入
            reports/<date>.json
```

### 2.3 Claude 如何读写本地文件

Claude Code 环境自带文件系统工具（Read / Write / Glob / Grep），SKILL.md 中声明数据目录路径 `~/.jobmirror/`，Claude 直接调用这些工具完成读写。不需要额外的 MCP 或服务进程。

```markdown
# SKILL.md 中的关键指令示例

## 数据目录
所有持久化数据存储在 `~/.jobmirror/`:
- 用户档案: `~/.jobmirror/profile.json`
- 岗位描述: `~/.jobmirror/jds/<id>.json`
- 分析报告: `~/.jobmirror/reports/<date>-<slug>.json`

## 导入简历流程
1. 用 Read 工具读取用户提供的简历文件
2. 解析并提取: 姓名、行业、技能(名称+熟练度)、项目经历、教育背景
3. 写入 `~/.jobmirror/profile.json`，保留已有数据并合并更新
```

---

## 3. Vue SPA 架构

### 3.1 技术选型

| 层面 | 选型 | 理由 |
|:---|:---|:---|
| 框架 | Vue 3 (Composition API) | 用户指定，生态成熟 |
| 构建工具 | Vite 5 | 快速开发，Vue 官方推荐 |
| 路由 | Vue Router 4 | SPA 页面导航，2-3 个路由足够 |
| 状态管理 | Pinia | 跨组件共享 profile/reports 状态，比 provide/inject 更结构化 |
| UI 样式 | 纯 CSS / CSS Variables | 零依赖，中文用户优先的可读性设计 |
| 图表 | 自行实现简易进度条/雷达图 | 避免引入图表库增加体积；SVG 手写雷达图约 100 行 |
| HTTP 客户端 | fetch (原生) | 零依赖，浏览器内置 |
| TypeScript | 否（JavaScript + JSDoc） | 降低初期复杂度，后续可加 |

### 3.2 组件树

```
App.vue
├── AppLayout.vue                    # 全局布局: 侧栏 + 内容区
│   ├── SideNav.vue                  # 左侧导航: 档案 | 岗位 | 报告
│   └── <RouterView>
│       ├── ProfilePage.vue          # / → 个人档案页
│       │   ├── BasicInfo.vue        #   基本信息 (姓名/行业/年限)
│       │   ├── SkillList.vue        #   技能列表 (熟练度进度条)
│       │   │   └── SkillItem.vue    #     单个技能行
│       │   ├── ExperienceList.vue   #   项目经历
│       │   │   └── ExperienceItem.vue
│       │   └── EducationList.vue    #   教育背景
│       │       └── EducationItem.vue
│       │
│       ├── JDPage.vue               # /jobs → 岗位管理
│       │   ├── JDList.vue           #   岗位列表
│       │   │   └── JDItem.vue       #     单个岗位卡片
│       │   └── JDDetail.vue         #   /jobs/:id → 岗位详情
│       │
│       └── ReportsPage.vue          # /reports → 报告列表
│           ├── ReportList.vue       #   报告卡片列表
│           │   └── ReportItem.vue   #     单个报告摘要
│           └── ReportDetail.vue     #   /reports/:id → 报告详情
│               ├── MatchScore.vue   #     综合匹配度环形图
│               ├── SkillGapChart.vue#     技能差距雷达图
│               ├── GapBreakdown.vue #     差距逐项分析
│               └── Suggestions.vue  #     简历修改建议
```

### 3.3 路由表

| 路径 | 页面组件 | 说明 |
|:---|:---|:---|
| `/` | ProfilePage | 个人技能档案看板 |
| `/jobs` | JDPage | 已保存的岗位列表 |
| `/jobs/:id` | JDDetail | 单个岗位详情 |
| `/reports` | ReportsPage | 分析报告列表 |
| `/reports/:id` | ReportDetail | 单份报告详情 |

总计 3 个页面级路由 + 2 个子路由，Vue Router 配置极简。

### 3.4 状态管理 (Pinia Stores)

```
stores/
├── profile.js     # 用户档案状态
│   - state: { data: null, loading, error }
│   - actions: { fetchProfile(), updateField() }
│
├── jds.js         # 岗位列表状态
│   - state: { list: [], current: null, loading, error }
│   - actions: { fetchJDs(), fetchJD(id), deleteJD(id) }
│
└── reports.js     # 报告状态
    - state: { list: [], current: null, loading, error }
    - actions: { fetchReports(), fetchReport(id), deleteReport(id) }
```

### 3.5 与文件服务的通信方式

Vue SPA 的所有数据请求通过 HTTP 发往本地 Node.js 文件服务 (`http://localhost:3099`):

```
Vue 组件 → Pinia action → fetch('http://localhost:3099/api/...') → Node.js 文件服务 → JSON 文件
```

在 Vite 开发模式下，配置代理避免跨域:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3099'
    }
  }
}
```

---

## 4. Node.js 文件服务设计

### 4.1 定位

**纯文件 IO 中间层，零业务逻辑。** 只负责将 HTTP 请求映射为 JSON 文件的读写。不做数据分析、不做格式校验（由 Claude Skill 和 Vue SPA 各自保证数据正确性）。

### 4.2 技术选型

使用 Node.js 内置 `http` 模块，不引入 Express/任何 npm 依赖。总代码量控制在 **50 行以内**。

### 4.3 API 设计（更新）

| 方法 | 路径 | 说明 | 对应文件操作 |
|:---|:---|:---|:---|
| GET | `/api/profile` | 获取用户档案 | 读 `profile.json` |
| PUT | `/api/profile` | 更新用户档案 | 写 `profile.json` |
| GET | `/api/jds` | 获取岗位列表 | 读 `jds/` 目录，返回摘要列表 |
| GET | `/api/jds/:id` | 获取单个岗位 | 读 `jds/:id.json` |
| **POST** | **`/api/jds`** | **新增：Vue 创建 JD** | **写 `jds/<id>.json`** |
| DELETE | `/api/jds/:id` | 删除岗位 | 删 `jds/:id.json` |
| GET | `/api/reports` | 获取报告列表 | 读 `reports/` 目录，返回摘要列表 |
| GET | `/api/reports/:id` | 获取单份报告 | 读 `reports/:id.json` |
| DELETE | `/api/reports/:id` | 删除报告 | 删 `reports/:id.json` |
| **PUT** | **`/api/inbox/resume`** | **新增：写入简历收件箱** | **写 `inbox/resume.txt`** |
| **GET** | **`/api/inbox/status`** | **新增：收件箱状态** | **读 `inbox/resume.txt` → `{ exists, size, processed }`** |

**变更说明**：Vue 端负责 JD 创建（用户粘贴 + 保存），Claude Skill 读取后回填 `parsed` 字段并生成报告。`inbox/` 用于首次拖拽简历上传的文本暂存，Claude Skill 工作流 0 从此处读取原始文本并解析为结构化档案。

### 4.4 启动方式

```bash
# 开发模式：两个终端
node server.js          # 终端1: 文件服务 (port 3099)
npm run dev             # 终端2: Vite dev server (port 5173, 代理 /api → 3099)

# 生产模式：单命令
node server.js          # 文件服务同时托管 dist/ 静态文件
```

---

## 5. 数据流全链路

### 5.1 场景 A：用户首次导入简历

```
用户: claude "用职镜导入简历 A:\resume.pdf"
  │
  ▼
Claude Code Skill (SKILL.md 驱动):
  1. Read A:\resume.pdf → 获取文本内容
  2. LLM 解析: 提取行业、技能(名称+熟练度)、项目经历、教育背景
  3. 检查 ~/.jobmirror/profile.json 是否存在
     - 不存在 → 创建新文件
     - 存在 → 合并更新 (新增技能追加，已有技能不覆盖)
  4. Write ~/.jobmirror/profile.json
  5. 终端输出摘要: "已导入 14 项技能、3 段项目经历、2 条教育背景"
  │
  ▼
用户打开浏览器访问 localhost:5173
  │
  ▼
Vue SPA (ProfilePage):
  1. Pinia action fetchProfile()
  2. GET http://localhost:3099/api/profile
  3. Node.js 文件服务: readFile ~/.jobmirror/profile.json → 返回 JSON
  4. 渲染档案看板: 技能列表、项目经历、教育背景
```

### 5.2 场景 B：用户对标分析某个岗位

```
用户: claude "用职镜分析这个 JD: [粘贴的岗位描述]"
  │
  ▼
Claude Code Skill:
  1. Read ~/.jobmirror/profile.json → 获取用户技能档案
  2. 解析 JD 文本 → 提取岗位要求 (技能、经验、学历等)
  3. LLM 对标分析:
     a. 技能匹配: 逐项对比用户技能 vs 岗位要求
     b. 评分: 匹配 / 部分匹配 / 未掌握
     c. 差距总结: 按优先级列出缺失技能
     d. 简历修改建议: 针对该岗位的关键词优化、表达调整
  4. 生成报告 JSON → Write ~/.jobmirror/reports/2026-06-16-产品经理.json
  5. 保存 JD → Write ~/.jobmirror/jds/2026-06-16-产品经理.json (可选)
  6. 终端输出摘要: "匹配度: 72% | 匹配 8 项, 部分匹配 3 项, 缺失 4 项"
  │
  ▼
用户打开浏览器 → /reports 页面
  │
  ▼
Vue SPA (ReportsPage → ReportDetail):
  1. Pinia action fetchReports() → GET /api/reports
  2. 点击报告 → fetchReport(id) → GET /api/reports/:id
  3. 渲染: 匹配度环、技能雷达图、差距分析、修改建议
```

### 5.3 场景 C：用户更新技能后重新对标

```
用户: claude "用职镜更新技能: Python 从熟练提升到精通, 新增 Docker"
  │
  ▼
Claude Code Skill:
  1. Read ~/.jobmirror/profile.json
  2. 更新指定技能
  3. Write ~/.jobmirror/profile.json (覆盖)
  4. 可选: 提示用户对之前保存的 JD 重新分析
```

### 5.4 场景 D：首次安装 — 拖拽简历初始化（新增）

```
用户打开浏览器 → Vue SPA 检测 profile 为空 → 自动跳转 /init
  │
  ▼
Vue SPA (OnboardingPage):
  1. 用户拖拽简历文件到 DragDropZone
  2. extractor.js 前端提取文本 (PDF→pdfjs / DOCX→mammoth / MD/TXT→FileReader)
  3. 展示 FilePreview 文本预览，用户确认
  4. PUT /api/inbox/resume → server.js 写入 ~/.jobmirror/inbox/resume.txt
  5. 弹窗提示终端命令，自动复制到剪贴板
  │
  ▼
用户切到终端: claude "用职镜导入收件箱"
  │
  ▼
Claude Code Skill (工作流 0):
  1. Read ~/.jobmirror/inbox/resume.txt → 获取简历原始文本
  2. LLM 解析: 提取行业、技能(名称+熟练度)、项目经历、教育背景
  3. Write ~/.jobmirror/profile.json (首次创建)
  4. 标记 inbox 已处理: 写入 ~/.jobmirror/inbox/.processed
  │
  ▼
Vue SPA 轮询 GET /api/inbox/status → 检测 processed=true → 自动跳转 / (档案页)
  │
  ▼
ProfilePage 渲染完整档案
```

### 5.5 场景 E：Web 端录入 JD → 终端分析（新增）

```
用户在 Vue /jobs 页粘贴 JD → 点击「保存岗位」
  │
  ▼
Vue SPA:
  1. POST /api/jds → server.js 写入 ~/.jobmirror/jds/2026-06-16-产品经理.json
  2. 用户再点击「生成分析报告」→ 弹窗显示终端命令(自动复制)
  │
  ▼
用户切到终端: claude "用职镜分析刚保存的岗位: 2026-06-16-产品经理"
  │
  ▼
Claude Code Skill (工作流 2):
  1. Read ~/.jobmirror/jds/2026-06-16-产品经理.json → 获取 JD rawText
  2. Read ~/.jobmirror/profile.json → 获取技能档案
  3. LLM 对标分析 → 生成报告 → Write ~/.jobmirror/reports/2026-06-16-产品经理.json
  4. 回填 JD parsed 字段
  │
  ▼
用户刷新 /reports 页 → 新报告可见
```

---

## 6. 技术风险与边界

| 风险点 | 等级 | 对策 |
|:---|:---|:---|
| Claude 分析质量依赖模型能力 | 中 | SKILL.md 中写死分析框架和评分标准，减少模型幻觉空间 |
| profile.json 并发写冲突 | 低 | Claude Skill 和 Vue 不会同时写（用户操作串行），文件服务加简易锁 |
| 中文简历解析准确率 | 中 | SKILL.md 中给出中文简历常见格式的解析指引 |
| `~/.jobmirror/` 路径跨平台 | 低 | Node.js 用 `os.homedir()` 处理；Claude 中用 `~` 展开 |
| 报告 JSON 体积膨胀 | 低 | 每次报告约 5-15KB，100 份约 1.5MB，不成问题 |

---

## 7. 未纳入本期范围

以下功能明确不在 MVP 中实现，但架构预留扩展点：

| 功能 | 扩展点 | 影响文件 |
|:---|:---|:---|
| 多 JD 横向对比 | reports 增加 `compare` 类型 | SKILL.md + ReportDetail.vue |
| 技能成长时间线 | profile.json 增加 `history` 数组 | profile.json schema |
| PDF 报告导出 | 前端增加打印样式 / 后端生成 | Vue SPA |
| 微信小程序 | 共享 `~/.jobmirror/` 数据层 | 全新增量 |
| 多份简历 (不同岗位方向) | profile.json 改为 profiles/ 目录 | data-model |

---

> **下一步**: 产出 `docs/data-model.md`，定义所有 JSON 文件的精确结构。
