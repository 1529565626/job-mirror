# 职镜 (JobMirror) · 数据模型设计

> 版本: v1.0 | 日期: 2026-06-16 | 作者: Coder Agent
> 阶段: 技术奠基 — 数据模型

---

## 1. 目录布局

```
~/.jobmirror/                        # 根目录，首次运行时自动创建
├── profile.json                     # 用户技能档案 (单文件，持续更新)
├── inbox/                           # 简历收件箱（Vue 拖拽上传暂存，Claude 读取后标记已处理）
│   ├── resume.txt                   # 前端提取的简历纯文本
│   └── .processed                   # 空标记文件，存在即表示已解析
├── jds/                             # 岗位描述存储
│   └── <YYYY-MM-DD>-<slug>.json     # 每份 JD 一个文件
├── reports/                         # 分析报告存储
│   └── <YYYY-MM-DD>-<slug>.json     # 每份分析报告一个文件
└── settings.json                    # 应用设置 (可选，不存在时使用默认值)
```

### 命名规范

- **slug**: 岗位标题的中文简称，去除特殊字符，限制 20 字以内。如 `高级产品经理`、`前端开发工程师`。
- **文件名唯一性**: `<日期>-<slug>` 组合天然保证唯一（同一天不会分析两个同名岗位）。
- **编码**: 所有文件 UTF-8，JSON 格式，2 空格缩进。
- **文件大小**: 单文件预估 2-20KB，100 份报告约 2MB，远低于关注阈值。

---

## 2. profile.json — 用户技能档案

### 2.1 完整结构

```json
{
  "version": "1.0",
  "createdAt": "2026-06-16T10:00:00+08:00",
  "updatedAt": "2026-06-16T10:00:00+08:00",
  "basic": {
    "name": "",
    "industry": "",
    "yearsOfExperience": 0,
    "currentRole": "",
    "targetRoles": [],
    "summary": ""
  },
  "skills": [
    {
      "name": "Python",
      "category": "编程语言",
      "proficiency": "advanced",
      "yearsUsed": 3,
      "lastUsed": "2026-06",
      "note": ""
    }
  ],
  "experiences": [
    {
      "company": "",
      "role": "",
      "description": "",
      "duration": {
        "start": "2021-03",
        "end": "2026-06"
      },
      "highlights": [
        "负责XX产品从0到1的搭建，DAU从0增长至50万"
      ]
    }
  ],
  "projects": [
    {
      "name": "",
      "role": "",
      "duration": {
        "start": "2022-06",
        "end": "2023-01"
      },
      "description": "",
      "highlights": [],
      "techStack": []
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "本科",
      "major": "",
      "graduationYear": 2019
    }
  ]
}
```

### 2.2 字段说明

#### basic — 基本信息

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `name` | string | 否 | 用户姓名（可留空保护隐私） |
| `industry` | string | 是 | 当前/目标行业，如"互联网/电商" |
| `yearsOfExperience` | integer | 否 | 工作年限，从经历自动推算 |
| `currentRole` | string | 否 | 当前职位 |
| `targetRoles` | string[] | 否 | 目标职位列表，用于 JD 匹配时的偏好排序 |
| `summary` | string | 否 | 一句话自我总结 |

#### skills — 技能列表

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `name` | string | 是 | 技能名称，如"Python"、"数据分析"、"项目管理" |
| `category` | string | 是 | 技能分类，见下方分类枚举 |
| `proficiency` | enum | 是 | 熟练度，见下方评级标准 |
| `yearsUsed` | number | 否 | 使用年限 |
| `lastUsed` | string | 否 | 最后使用时间 (YYYY-MM) |
| `note` | string | 否 | 补充说明 |

**熟练度评级 (5 级)**:

| 等级 | 标识 | 含义 | 典型描述 |
|:---|:---|:---|:---|
| `novice` | 入门 | 了解基本概念，需要指导 | "了解基础语法" |
| `intermediate` | 中级 | 能独立完成任务 | "能独立完成常规开发任务" |
| `advanced` | 高级 | 熟练掌握，能解决复杂问题 | "熟练掌握，有3年项目经验" |
| `proficient` | 精通 | 深入理解原理，能指导他人 | "精通，曾主导架构设计" |
| `expert` | 专家 | 行业公认水平，能创新 | "发表过相关论文/开源项目维护者" |

**技能分类枚举**:

| 分类 | 示例技能 |
|:---|:---|
| `编程语言` | Python, Java, JavaScript, Go, C++ |
| `框架/工具` | React, Vue, Django, Docker, K8s |
| `数据分析` | SQL, Excel, Tableau, Pandas, SPSS |
| `产品/设计` | 需求分析, 原型设计, 用户研究, A/B测试 |
| `运营/市场` | 用户增长, SEO, 内容运营, 社群运营 |
| `管理/软技能` | 项目管理, 团队管理, 跨部门沟通, 演讲 |
| `语言` | 英语, 日语, 韩语 |
| `其他` | 兜底分类 |

#### experiences — 工作经历

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `company` | string | 是 | 公司/组织名称 |
| `role` | string | 是 | 担任职位 |
| `description` | string | 否 | 岗位核心职责描述（保留简历原文，1-3 句话） |
| `duration.start` | string | 是 | 开始时间 (YYYY-MM) |
| `duration.end` | string | 否 | 结束时间 (YYYY-MM)，空字符串表示"至今" |
| `highlights` | string[] | 是 | 关键成果列表，每条 1-2 句话，量化优先 |

#### projects — 项目经历

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `name` | string | 是 | 项目名称 |
| `role` | string | 否 | 在项目中的角色（如"前端负责人"） |
| `duration.start` | string | 否 | 开始时间 (YYYY-MM) |
| `duration.end` | string | 否 | 结束时间 (YYYY-MM) |
| `description` | string | 否 | 项目简介/描述 |
| `highlights` | string[] | 否 | 项目关键成果 |
| `techStack` | string[] | 否 | 使用的技术栈 |

#### education — 教育背景

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `school` | string | 是 | 学校名称 |
| `degree` | string | 是 | 学位（高中/大专/本科/硕士/博士/MBA） |
| `major` | string | 是 | 专业名称 |
| `graduationYear` | integer | 是 | 毕业年份 |

### 2.3 合并更新策略

当用户多次导入简历时，Claude Skill 执行**增量合并**而非覆盖：

```
规则:
1. basic 字段: 后导入的值覆盖先前的（用户可能更新了目标岗位）
2. skills: 按名称去重，同名技能保留较新的值（proficiency 取较高者，note 合并）
3. experiences: 按公司+角色去重，完全相同的覆盖，不同的追加
4. projects: 按 name 去重，相同的覆盖，不同的追加
5. education: 按学校+学位去重，相同的覆盖
5. updatedAt: 每次合并后更新
```

### 2.4 最小可用示例

首次使用、简历信息极少时的最低合法 profile.json：

```json
{
  "version": "1.0",
  "createdAt": "2026-06-16T10:00:00+08:00",
  "updatedAt": "2026-06-16T10:00:00+08:00",
  "basic": {
    "industry": "互联网"
  },
  "skills": [],
  "experiences": [],
  "education": []
}
```

---

## 3. jds/<id>.json — 岗位描述存储

### 3.1 完整结构

```json
{
  "id": "2026-06-16-高级产品经理",
  "createdAt": "2026-06-16T14:30:00+08:00",
  "rawText": "【岗位描述】\n负责公司电商平台产品规划与迭代...\n\n【任职要求】\n1. 3年以上产品经验...",
  "parsed": {
    "title": "高级产品经理",
    "company": "",
    "industry": "",
    "requiredSkills": [
      {
        "name": "数据分析",
        "level": "熟练掌握",
        "importance": "required"
      },
      {
        "name": "SQL",
        "level": "了解",
        "importance": "preferred"
      }
    ],
    "requiredExperience": {
      "years": 3,
      "fields": []
    },
    "requiredEducation": {
      "degree": "本科",
      "majors": []
    },
    "responsibilities": [
      "负责产品规划与迭代",
      "协调研发、设计、运营团队推进项目"
    ]
  },
  "reportIds": [
    "2026-06-16-高级产品经理"
  ]
}
```

### 3.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `id` | string | 是 | `<日期>-<slug>`，唯一标识 |
| `createdAt` | string | 是 | ISO 8601 时间戳 |
| `rawText` | string | 是 | 用户粘贴的原始 JD 全文 |
| `parsed` | object | 否 | Claude 解析后的结构化 JD 信息，首次保存时可为 null |
| `parsed.title` | string | 否 | 岗位名称 |
| `parsed.company` | string | 否 | 公司名称（从 JD 中提取，可能为空） |
| `parsed.industry` | string | 否 | 所属行业 |
| `parsed.requiredSkills` | array | 否 | 岗位要求的技能列表 |
| `parsed.requiredSkills[].name` | string | 是 | 技能名称 |
| `parsed.requiredSkills[].level` | string | 否 | 岗位要求的掌握程度描述（保留原文表述） |
| `parsed.requiredSkills[].importance` | enum | 是 | `required`(必须) / `preferred`(加分项) |
| `parsed.requiredExperience.years` | number | 否 | 要求工作年限 |
| `parsed.requiredExperience.fields` | string[] | 否 | 要求的具体领域经验 |
| `parsed.requiredEducation.degree` | string | 否 | 学历要求 |
| `parsed.requiredEducation.majors` | string[] | 否 | 专业要求 |
| `parsed.responsibilities` | string[] | 否 | JD 中列出的主要职责 |
| `reportIds` | string[] | 否 | 关联的分析报告 ID 列表（同一 JD 可能多次分析） |

### 3.3 生命周期

```
用户粘贴 JD 文本
    │
    ▼
保存为 jds/<id>.json  (rawText 有值, parsed 为 null)
    │
    ▼
Claude 对标分析        (Skill 读取 rawText, 解析为 parsed, 回写文件)
    │
    ▼
生成报告               (reportIds 追加新的报告 ID)
    │
    ▼
用户可再次分析同一 JD  (用于技能更新后重新对标)
```

### 3.4 最小可用示例

```json
{
  "id": "2026-06-16-产品经理",
  "createdAt": "2026-06-16T14:30:00+08:00",
  "rawText": "高级产品经理\n职责：1. 产品规划 2. 数据分析\n要求：3年经验，本科",
  "parsed": null,
  "reportIds": []
}
```

---

## 4. reports/<id>.json — 分析报告

### 4.1 完整结构

```json
{
  "id": "2026-06-16-高级产品经理",
  "createdAt": "2026-06-16T14:45:00+08:00",
  "jdId": "2026-06-16-高级产品经理",
  "profileSnapshot": {
    "skillCount": 14,
    "industry": "互联网/电商",
    "yearsOfExperience": 5
  },
  "match": {
    "overallScore": 72,
    "breakdown": {
      "skillMatch": 68,
      "experienceMatch": 80,
      "educationMatch": 75
    },
    "summary": "您的技能与岗位要求有较高匹配度。核心技能数据分析、项目管理已满足，但缺少 SQL 和用户研究经验。"
  },
  "skillAnalysis": [
    {
      "skillName": "数据分析",
      "category": "数据分析",
      "jdImportance": "required",
      "userProficiency": "advanced",
      "jdRequirement": "熟练掌握",
      "match": "matched",
      "note": ""
    },
    {
      "skillName": "SQL",
      "category": "数据分析",
      "jdImportance": "preferred",
      "userProficiency": null,
      "jdRequirement": "了解",
      "match": "missing",
      "note": "岗位优先考虑的加分技能",
      "learningAdvice": {
        "estimatedWeeks": 4,
        "difficulty": "低",
        "suggestions": [
          {
            "type": "course",
            "title": "SQL 基础入门",
            "description": "学习 SELECT/JOIN/GROUP BY 等核心语法",
            "estimatedHours": 20
          },
          {
            "type": "practice",
            "title": "LeetCode SQL 练习",
            "description": "完成 20 道中等难度 SQL 题",
            "estimatedHours": 15
          }
        ]
      }
    },
    {
      "skillName": "项目管理",
      "category": "管理/软技能",
      "jdImportance": "required",
      "userProficiency": "advanced",
      "jdRequirement": "具备项目管理经验",
      "match": "matched",
      "note": ""
    },
    {
      "skillName": "用户研究",
      "category": "产品/设计",
      "jdImportance": "required",
      "userProficiency": null,
      "jdRequirement": "有用户调研和需求分析经验",
      "match": "missing",
      "note": "岗位核心要求，优先级最高",
      "learningAdvice": {
        "estimatedWeeks": 8,
        "difficulty": "中",
        "suggestions": [
          {
            "type": "course",
            "title": "用户研究方法论",
            "description": "涵盖访谈、问卷、可用性测试等核心方法",
            "estimatedHours": 30
          },
          {
            "type": "project",
            "title": "实践项目：为任意 App 做用户研究并产出报告",
            "description": "选择一个熟悉的 App，访谈5位用户，输出体验优化建议",
            "estimatedHours": 20
          }
        ]
      }
    }
  ],
  "resumeSuggestions": [
    {
      "section": "项目经历",
      "priority": "high",
      "issue": "缺少数据分析相关项目成果的量化描述",
      "suggestion": "建议在项目经历中增加：'通过数据分析发现XX问题，推动产品迭代后DAU提升X%'",
      "reason": "JD 第一条职责即要求'通过数据分析驱动产品决策'，当前简历中该能力体现不足"
    },
    {
      "section": "技能列表",
      "priority": "medium",
      "issue": "技能列表未体现用户研究能力",
      "suggestion": "如有任何用户调研经验（问卷、访谈、可用性测试），请在技能列表中补充",
      "reason": "用户研究是 JD 的核心要求"
    }
  ],
  "interviewPrep": [
    {
      "topic": "数据分析驱动决策",
      "importance": "high",
      "prepPoints": [
        "准备一个你用数据说服团队改变决策的真实案例（STAR 框架）",
        "准备一个数据告诉你'反直觉结论'的案例",
        "了解 A/B 测试的统计学基础（样本量计算、置信度）"
      ]
    },
    {
      "topic": "用户研究经验",
      "importance": "high",
      "prepPoints": [
        "即使没有正式用户研究经验，准备一个你主动了解用户需求的例子",
        "了解定性 vs 定量研究方法的区别和适用场景"
      ]
    }
  ]
}
```

### 4.2 字段说明

#### 报告元信息

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `id` | string | `<日期>-<slug>`，与 JD id 保持一致 |
| `createdAt` | string | 报告生成时间 |
| `jdId` | string | 关联的 JD 文件 ID |
| `profileSnapshot` | object | 分析时用户档案的快照（摘要级，不全量复制） |

#### match — 匹配度

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `overallScore` | integer | 综合匹配度，0-100，5 的整数倍（0/5/10/.../100） |
| `breakdown.skillMatch` | integer | 技能维度匹配度 0-100 |
| `breakdown.experienceMatch` | integer | 经验维度匹配度 0-100 |
| `breakdown.educationMatch` | integer | 学历维度匹配度 0-100 |
| `summary` | string | 匹配度总结（1-2 句话，Claude 生成） |

**评分逻辑**（在 SKILL.md 中固化）:
```
overallScore = skillMatch × 0.5 + experienceMatch × 0.3 + educationMatch × 0.2
```

#### skillAnalysis — 逐技能对标

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `skillName` | string | 技能名称 |
| `category` | string | 技能分类（与 profile.json 的 category 枚举一致） |
| `jdImportance` | enum | `required` / `preferred` |
| `userProficiency` | string/null | 用户的熟练度等级；未掌握则为 null |
| `jdRequirement` | string | 岗位要求的掌握程度（保留 JD 原文表述） |
| `match` | enum | `matched`(完全匹配) / `partial`(部分匹配) / `missing`(未掌握) |
| `note` | string | 简短说明 |
| `learningAdvice` | object/null | 仅 `missing` 或 `partial` 时有，提供补课建议 |

**match 判定规则**:
```
userProficiency >= jdImpliedLevel  →  matched
userProficiency 存在但不足        →  partial
userProficiency == null           →  missing
```

#### learningAdvice — 学习建议（技能差距的"处方"）

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `estimatedWeeks` | number | 补齐该技能的预估周数 |
| `difficulty` | enum | `低` / `中` / `高` |
| `suggestions` | array | 具体学习建议列表 |
| `suggestions[].type` | enum | `course`(在线课程) / `practice`(练习) / `project`(项目) / `book`(书籍) |
| `suggestions[].title` | string | 建议标题 |
| `suggestions[].description` | string | 建议描述 |
| `suggestions[].estimatedHours` | number | 预估耗时（小时） |

#### resumeSuggestions — 简历修改建议

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `section` | string | 建议修改的简历板块（技能列表/项目经历/自我评价/教育背景） |
| `priority` | enum | `high` / `medium` / `low` |
| `issue` | string | 当前存在的问题 |
| `suggestion` | string | 具体修改建议 |
| `reason` | string | 为什么这样改（关联 JD 中的具体要求） |

#### interviewPrep — 面试准备建议

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `topic` | string | 面试准备主题 |
| `importance` | enum | `high` / `medium` / `low` |
| `prepPoints` | string[] | 具体准备要点，每条一个可执行的行动项 |

---

## 5. settings.json — 应用设置

```json
{
  "language": "zh-CN",
  "theme": "light",
  "nodeServerPort": 3099,
  "lastViewedReportId": null
}
```

| 字段 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `language` | string | `zh-CN` | 界面语言 |
| `theme` | string | `light` | `light` / `dark` |
| `nodeServerPort` | number | `3099` | 文件服务端口 |
| `lastViewedReportId` | string/null | null | 记录上次查看的报告，方便快速跳转 |

---

## 6. 数据一致性保障

### 6.1 读写策略

| 场景 | 写者 | 冲突风险 | 处理方式 |
|:---|:---|:---|:---|
| 更新 profile | Claude Skill (主导) / Vue (用户手动编辑) | 中 | 用户操作串行；文件服务在写入前加简单文件锁（`.lock` 临时文件） |
| 新增 JD | Claude Skill / Vue | 低 | 同一 ID 不会同时创建 |
| 新增报告 | Claude Skill (唯一起源) | 无 | 只有一个写者 |
| 删除 JD/报告 | Vue (用户手动) | 无 | — |

### 6.2 profile 快照策略

分析报告中的 `profileSnapshot` 只记录摘要信息（技能数量、行业、年限），**不全量复制 profile.json**。目的：

1. 避免报告文件膨胀
2. 技能详情以分析时刻的 profile.json 为准
3. 如需回溯，用户可通过报告时间戳定位当时的 profile 状态（profile.json 中技能有 `lastUsed` 字段辅助追溯）

### 6.3 数据迁移

当 schema 升级时（version 字段变更），Vue SPA 启动时检测 version 差异，执行迁移逻辑：

```
if (profile.version !== CURRENT_VERSION) {
  执行迁移脚本
  更新 version
  写入文件
}
```

---

## 7. 数据安全

- **无个人信息泄露风险**：所有数据存储在用户本机 `~/.jobmirror/`，不经过网络传输。
- **name 字段可选**：用户可以选择不填真实姓名，profile.json 中 name 可为空字符串。
- **rawText 保留原文**：JD 文件中保留用户粘贴的原始文本，方便回溯核对。
- **无删除逻辑**：目前不实现物理删除（仅标记隐藏），避免误操作丢失数据。MVP 阶段先支持真实删除。

---

> **下一步**: 产出 `docs/skill-design.md`，定义 SKILL.md 的指令结构和交互约定。
