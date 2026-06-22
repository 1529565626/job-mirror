# 职镜 (JobMirror) · 项目进度日志

2026-06-16  需求接收 → 用户提出"面试技能对标 Skill"需求，核心功能定位：简历解析→技能记忆持久化→JD对标分析→报告生成
 ├─ 2026-06-16  市场调研 → 产出 docs/market-research.md
 │   └─ 结论: 需求真实但已是红海早期；clawcv (超级简历) + Resume-Matcher (27k Stars) 等 10+ 竞品；唯一有效卡位："100%本地+完全开源+技能差距→学习建议闭环"
 │
 ├─ 2026-06-16  可行性分析 → 产出 docs/feasibility.md
 │   └─ 综合评级 C+（谨慎可行）；最大风险：分发渠道极窄（Claude Code 中文用户基数小）；最大机会：隐私优先 + 技能成长闭环
 │   └─ 建议战略：Skill 作为前端入口 + Web 应用作为主力载体
 │   └─ 下一步：先验证致命级待确认项（用户调研 2-3 天），再决定是否启动 MVP 开发
 │
 ├─ 同日  技术方案讨论 → 确定架构：Claude Code Skill + Vue 3 SPA + 本地文件桥接，零云端依赖；明确数据持久化方案（JSON 本地文件）
 │
 ├─ 同日  项目命名 → 选定「职镜 / JobMirror」；传达"照见差距、以镜自省"的产品精神
 │
 ├─ 同日  PM 初始化 → 创建 PROJECT_STATUS.md，补齐 CLAUDE.md；项目已注册于根 PROJECTS.md
 │
 ├─ 同日  技术奠基（Coder Agent）→ 产出 5 份文档，PM 审核通过
 │   ├─ docs/architecture.md — 系统架构：SKILL.md + Vue SPA + 本地文件桥接
 │   ├─ docs/data-model.md — 数据模型：profile/JD/报告 JSON schema + 合并策略
 │   ├─ docs/skill-design.md — Skill 封装：SKILL.md 完整草案（6 工作流 + 评分公式）
 │   ├─ docs/frontend-arch.md — 前端架构：组件树 + Pinia stores + server.js(60行)
 │   ├─ CLAUDE.md — 已更新技术方向与目录脚手架
 │   └─ 关键决策: SKILL.md 替代 MCP Server / Vue 3 零 UI 库 / server.js 纯 Node 内置模块
 │
 └─ 同日  交互设计深化（PM 主导）→ 纳入拖拽简历初始化 + JD 粘贴录入
     ├─ 新增 OnboardingPage (/init)：拖拽 PDF/DOCX/MD → 前端提取文本 → 收件箱 → Claude 解析
     ├─ 新增 JDInputForm：Vue 端粘贴 JD → 保存 + 生成报告按钮 → 弹窗引导终端执行
     ├─ 更新 API：+POST /api/jds, +PUT /api/inbox/resume, +GET /api/inbox/status
     ├─ 更新 Skill：+工作流 0（导入收件箱）
     ├─ 新增前端依赖：pdfjs-dist(PDF提取) + mammoth(DOCX提取)，浏览器端完成
     └─ 涉及文档更新：frontend-arch.md, architecture.md, data-model.md, skill-design.md, CLAUDE.md

2026-06-17  脚手架搭建（Coder Agent）→ 39 个文件，vite build 通过
 ├─ server.js — Node 文件服务（103 行，零依赖，端口 3099，RESTful JSON API）
 ├─ web/ — Vue 3 SPA 完整骨架（34 个文件）
 │   ├─ 配置: package.json, vite.config.js, index.html
 │   ├─ 入口: main.js, App.vue
 │   ├─ 路由: router/index.js（5 条路由 + 懒加载）
 │   ├─ 状态: stores/profile.js, jds.js, reports.js（三态管理）
 │   ├─ 服务: services/api.js（28 行 fetch 封装）
 │   ├─ 页面: ProfilePage, JDPage, ReportsPage（3 页面）
 │   ├─ 布局: AppLayout（侧栏+内容区）, SideNav
 │   ├─ 组件: 21 个占位组件（profile 7 + jd 3 + report 7 + shared 4）
 │   └─ 样式: variables.css, reset.css, global.css
 ├─ skill/SKILL.md — Skill 占位（6 工作流骨架 + 评分公式）
 └─ 验证: npx vite build → 423ms, 0 errors

同日  组件实装（Coder Agent）→ 补齐完整用户交互链路，vite build 通过
 ├─ 新增: utils/fileExtractor.js（浏览器端 PDF/DOCX/MD/TXT 文本提取）
 ├─ ProfilePage — 拖拽上传区（5 态交互: 默认/拖拽/提取中/成功/失败）
 │   └─ 提取后通过 PUT /api/inbox/resume 保存，引导终端执行「用职镜导入收件箱」
 ├─ JDPage — 折叠表单录入（岗位名 + JD 文本 → POST /api/jds → 终端命令引导）
 ├─ stores/profile.js — 补 saveResume() + checkInboxStatus() actions
 ├─ stores/jds.js — 补 create({ title, rawText }) action（自生成 ID）
 ├─ JDItem.vue — 补 goDetail() 路由跳转
 └─ 验证: npx vite build → 0 errors（928KB chunk 因 pdfjs-dist，符合预期）

同日  SKILL.md 完整实现（Coder Agent）→ 95 行 → 709 行生产可用 Skill
 ├─ 8 章节: 角色定义/数据目录/数据模型参考/核心工作流/中文简历解析指引/输出格式约定/评分标准/注意事项
 ├─ 6 工作流完整: 导入收件箱(0)/导入简历(1)/分析岗位(2)/查看档案(3)/修改技能(4)/查看报告(5)/对比岗位(6)
 ├─ 评分标准含完整计算示例（3 技能 → 85 分推导）
 ├─ 中文简历解析: 板块识别表(8 类) + 熟练度映射表(5 级含特殊情况) + 年限推算 + 日期归一化
 ├─ 增量合并策略: 4 组字段不同的合并规则（basic 覆盖/skills 取最高/experiences 追加/education 去重）
 └─ 注意事项: 禁止行为 6 条 + 已知局限 5 项 + Vue SPA 协作关系图

2026-06-17  design-keai 重设计（PM 主导）→ 4 问题闭环修复
 ├─ 问题 1: 源文件查看 → 新增二进制文件存储 + PDF canvas 渲染 + DOCX mammoth HTML 转换
 ├─ 问题 2: 技能清单 → 圆点改星标（★☆），品牌黄 #F4D758 填充
 ├─ 问题 3: 页面布局 → 采用 esther design-keai 设计系统重设计
 │   ├─ 设计令牌: 品牌三色(蓝#2B7FD8 60%/黄#F4D758 30%/红#E84A5F 10%) + 衬线标题+无衬线正文
 │   ├─ Layout: Sticky Header(56px) + 固定侧栏(220px) + 内容区(max-width 1080px)
 │   ├─ 配色: 奶油底#fefcf6 + 白卡片 + 墨色文字#1A1A2E
 │   └─ 字体: Noto Serif SC(标题) + Noto Sans SC(正文)
 ├─ 问题 4: 工作经历 → 新增 description 字段保留职责原文
 └─ 新增: 项目经历 → data-model 新增 projects[] + 前端 ProjectList/ProjectItem 组件 + SKILL.md 解析规则

=== 当前状态 ===

  状态: 开发中
  阶段: 重设计验证 — vite build + 端到端联调
同日  报告详情页重设计 — 简历编辑器 + 导出 + SKILL 完善
 ├─ 报告详情双栏布局（左侧分析报告 + 右侧简历编辑&预览）
 ├─ 简历编辑器：MD格式化 + 修改记录 + 简历配置（项目数/排序/向上弹出）
 ├─ 修改建议「应用」→ 追踪到编辑器 + 可撤销（含精准撤销和回退）
 │   └─ 项目经历建议 → 弹窗选择目标项目 → 增量补充到项目描述
 ├─ 预览：design-keai 风格 HTML 新标签页打开 → 支持重新生成 + 刷新不丢状态
 ├─ 导出下载：HTML / MD / DOC / PDF
 └─ SKILL.md: 新增项目经历建议规范（增量补充/不指定项目名/风格一致）

2026-06-22  #1 导出格式完善（Coder Agent）→ 完成
 ├─ PDF: html2canvas + jsPDF 生成真正 PDF（A4分页、2x清晰度），替代 window.print()
 ├─ DOC: 完整 MSO HTML 格式（3个XML命名空间 + @page + mso-* 专属CSS + 中文字体回退）
 └─ 验证: npx vite build → 0 errors

2026-06-22  简历排版引擎重构 — 借鉴 RenderCV 三层分离模式（PM主导 + Coder实施）
 ├─ 备份: cani → cani-backup（完整项目拷贝）
 ├─ 调研: A:\claude-develop\Project-develop\resume-skill-research\research-findings.md（691行，30+项目）
 │   └─ P0三项目: RenderCV(内容/设计分离) / JSON Resume(Schema标准) / ResumeSkills(Skill分类)
 ├─ 新增: web/src/components/resume/（7个Vue组件 + 1个CSS令牌文件）
 │   ├─ resume-theme.css — 简历专属设计令牌（页面尺寸/间距/星级/打印样式）
 │   ├─ ResumeTemplate.vue — 主模板编排器（接收profile+config，组合6个子组件）
 │   ├─ ResumeHeader.vue — 姓名/职位/摘要引用块
 │   ├─ ResumeBasicInfo.vue — 基本信息双列网格
 │   ├─ ResumeSkillList.vue — 按分类分组 + ★☆熟练度星级
 │   ├─ ResumeExperienceList.vue — 工作经历时间线
 │   ├─ ResumeProjectList.vue — 项目卡片（排序/数量配置 + 技术栈标签）
 │   └─ ResumeEducationList.vue — 教育背景
 ├─ 重构: ResumePanel.vue — HTML字符串拼接 → Vue组件渲染
 │   ├─ 移除 Claude 轮询预览（previewState/polling），改为即时组件渲染
 │   ├─ 预览: 隐藏div渲染ResumeTemplate → 提取innerHTML → buildResumePage → 新窗口
 │   ├─ 导出: 从renderRef提取HTML → 传入exportPDF/exportAsDoc/downloadBlob
 │   ├─ 降级: profile数据不可用时回退到基础MD→HTML转换
 │   └─ 保留: MD textarea编辑器 + buildFormattedMD() + 修改追踪/撤销
 └─ 验证: npx vite build → 0 errors（590 modules）

=== 待办需求 ===

 📋 #2 接入简历书写布局 skill（部分完成）
    ✅ 三层分离组件体系已建立（数据层/CSS Token设计层/Vue渲染层）
    ⬜ 多模板切换机制（default / modern / classic 等主题）
    ⬜ Typst CLI 作为 PDF 导出后端（可选，当前 html2canvas 已满足需求）
    状态: 基础组件已完成，待扩展多模板

 📋 #3 简历编辑面板可折叠
    默认隐藏右侧面板，用户点击触发按钮后展开
    按钮为非规则矩形（胶囊/圆形/异形），hover 放大特效
    未悬停时收缩在右侧边缘
    状态: 待设计

=== 当前状态 ===

  状态: 开发中
  阶段: 三层分离排版引擎完成 — 待办 #2 基础已就绪，#3 排队中
  阻塞: 无
  下一步: #3 简历编辑面板可折叠，或 #2 多模板扩展
