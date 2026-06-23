<!-- ComparePage.vue — 岗位对比：勾选JD → 横向多维对比表 -->
<template>
  <div class="compare-page">
    <h1 class="page-title">岗位对比</h1>

    <LoadingSpinner v-if="loading" text="加载岗位数据..." />

    <template v-else>
      <!-- 选择区 -->
      <section class="card select-section">
        <h2 class="section-title">选择要对比的岗位（至少 2 个）</h2>
        <div v-if="jdList.length === 0" class="empty-text">暂无已保存的岗位，请先在「岗位管理」中录入 JD</div>
        <div class="jd-select-grid">
          <div
            v-for="jd in jdList"
            :key="jd.id"
            class="jd-select-card"
            :class="{ selected: selected.includes(jd.id), 'has-report': jd.hasReport }"
            @click="toggle(jd.id)"
          >
            <span class="jd-checkbox">{{ selected.includes(jd.id) ? '☑' : '☐' }}</span>
            <span class="jd-select-title">{{ jd.title || jd.id }}</span>
            <span v-if="jd.hasReport" class="jd-score-badge">{{ jd.score }}%</span>
            <span v-else class="jd-no-report">未分析</span>
          </div>
        </div>
        <p class="select-hint">已选 {{ selected.length }} 个岗位</p>
      </section>

      <!-- 对比表 -->
      <section v-if="selected.length >= 2" class="card compare-section">
        <h2 class="section-title">多维对比</h2>
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="col-label">维度</th>
                <th v-for="id in selected" :key="id" class="col-data">
                  {{ jdMap[id]?.title || id }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 综合匹配度 -->
              <tr>
                <td class="col-label">综合匹配度</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">
                    <div class="score-bar-wrap">
                      <div class="score-bar" :style="{ width: reports[id].match?.overallScore + '%' }" :class="scoreColor(reports[id].match?.overallScore)"></div>
                    </div>
                    <span class="score-text">{{ reports[id].match?.overallScore }}%</span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 技能匹配 -->
              <tr>
                <td class="col-label">技能匹配</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">
                    {{ reports[id].match?.breakdown?.skillMatch }}%
                    <span class="detail-text">({{ matchedCount(id) }}/{{ totalSkills(id) }})</span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 经验匹配 -->
              <tr>
                <td class="col-label">经验匹配</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">{{ reports[id].match?.breakdown?.experienceMatch }}%</template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 学历匹配 -->
              <tr>
                <td class="col-label">学历匹配</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">{{ reports[id].match?.breakdown?.educationMatch }}%</template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 硬技能缺口 -->
              <tr>
                <td class="col-label">硬技能缺口</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">
                    <span class="gap-count missing">{{ missingHardCount(id) }}</span>
                    <span class="detail-text"> 项缺失</span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 软技能缺口 -->
              <tr>
                <td class="col-label">软技能缺口</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">
                    <span class="gap-count missing">{{ missingSoftCount(id) }}</span>
                    <span class="detail-text"> 项缺失</span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 简历修改量 -->
              <tr>
                <td class="col-label">简历修改建议</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">{{ (reports[id].resumeSuggestions || []).length }} 条</template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 面试准备 -->
              <tr>
                <td class="col-label">面试准备主题</td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <template v-if="reports[id]">{{ (reports[id].interviewPrep || []).length }} 个</template>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <!-- 操作 -->
              <tr>
                <td class="col-label"></td>
                <td v-for="id in selected" :key="id" class="col-data">
                  <RouterLink v-if="reports[id]" :to="`/reports/${id}`" class="btn-view">查看报告 →</RouterLink>
                  <button v-else-if="jdMap[id]?.hasReport === false" class="btn-analyze" @click="triggerAnalyze(id)">开始分析</button>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 推荐 -->
        <div v-if="bestPick" class="recommendation">
          🎯 推荐优先投递：<strong>{{ jdMap[bestPick]?.title || bestPick }}</strong>
          <span class="rec-detail">— 综合匹配度 {{ reports[bestPick]?.match?.overallScore }}%，缺失技能最少</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/services/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const loading = ref(true)
const jdList = ref([])
const jdMap = ref({})
const reports = ref({})
const selected = ref([])

onMounted(async () => {
  try {
    // 加载所有 JD
    const jds = await api.get('/api/jds') || []
    jdList.value = jds.map(j => {
      const title = j.title || (j.id || '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
      jdMap.value[j.id] = { ...j, title }
      return { id: j.id, title, hasReport: false, score: 0 }
    })

    // 并行尝试加载所有报告
    const results = await Promise.allSettled(
      jdList.value.map(j => api.get(`/api/reports/${encodeURIComponent(j.id)}`).catch(() => null))
    )
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value && r.value.match) {
        reports.value[jdList.value[i].id] = r.value
        jdList.value[i].hasReport = true
        jdList.value[i].score = r.value.match.overallScore || 0
      }
    })
  } catch {} finally { loading.value = false }
})

function toggle(id) {
  const idx = selected.value.indexOf(id)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(id)
}

function matchedCount(id) {
  return (reports.value[id]?.skillAnalysis || []).filter(s => s.match === 'matched').length
}
function totalSkills(id) {
  return (reports.value[id]?.skillAnalysis || []).length
}
function missingHardCount(id) {
  return (reports.value[id]?.skillAnalysis || []).filter(s => s.match === 'missing' && s.category === 'hard').length
}
function missingSoftCount(id) {
  return (reports.value[id]?.skillAnalysis || []).filter(s => s.match === 'missing' && s.category === 'soft').length
}

function scoreColor(s) {
  if (s >= 80) return 'score-high'
  if (s >= 60) return 'score-mid'
  return 'score-low'
}

const bestPick = computed(() => {
  if (selected.value.length < 2) return null
  let best = selected.value[0]
  let bestScore = -1
  for (const id of selected.value) {
    const r = reports.value[id]
    if (!r) continue
    const s = r.match?.overallScore || 0
    // 匹配置高 + 缺失技能少
    const missing = (r.skillAnalysis || []).filter(sk => sk.match === 'missing').length
    const composite = s - missing * 3
    if (composite > bestScore) { bestScore = composite; best = id }
  }
  return bestScore > -1 ? best : null
})

async function triggerAnalyze(id) {
  try { await api.post(`/api/jds/${encodeURIComponent(id)}/process`) } catch {}
}
</script>

<style scoped>
.compare-page { width: 100%; }
.select-section { margin-bottom: var(--space-lg); }
.jd-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-sm); margin-top: var(--space-md); }
.jd-select-card {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md); border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border); cursor: pointer; transition: all .15s;
  background: var(--color-surface);
}
.jd-select-card:hover { border-color: var(--blue); }
.jd-select-card.selected { border-color: var(--blue); background: var(--color-primary-bg); }
.jd-select-card.has-report { border-left: 3px solid var(--color-success); }
.jd-checkbox { font-size: 1.1rem; flex-shrink: 0; }
.jd-select-title { flex: 1; font-size: var(--text-sm); font-weight: 500; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jd-score-badge { font-size: var(--text-xs); font-weight: 700; color: var(--color-success); background: #27ae6020; padding: 1px 8px; border-radius: 10px; }
.jd-no-report { font-size: var(--text-xs); color: var(--color-text-muted); }
.select-hint { margin-top: var(--space-sm); font-size: var(--text-sm); color: var(--color-text-muted); }
.empty-text { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; padding: var(--space-lg); }

.compare-table-wrap { overflow-x: auto; margin-top: var(--space-md); }
.compare-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.compare-table th, .compare-table td { padding: var(--space-sm) var(--space-md); text-align: left; border-bottom: 1px solid var(--color-border); }
.compare-table thead th { font-weight: 700; color: var(--color-text); background: var(--color-bg); position: sticky; top: 0; }
.col-label { font-weight: 600; color: var(--color-text-secondary); white-space: nowrap; min-width: 100px; }
.col-data { min-width: 140px; color: var(--color-text); }
.text-muted { color: var(--color-text-muted); }
.detail-text { font-size: var(--text-xs); color: var(--color-text-muted); }
.gap-count.missing { font-weight: 700; color: var(--red); }

.score-bar-wrap { height: 6px; background: var(--color-border); border-radius: 3px; margin-bottom: 4px; overflow: hidden; }
.score-bar { height: 100%; border-radius: 3px; transition: width .4s; }
.score-high { background: #27ae60; }
.score-mid { background: var(--yellow); }
.score-low { background: var(--red); }
.score-text { font-size: var(--text-sm); font-weight: 700; color: var(--color-text); }

.recommendation { margin-top: var(--space-lg); padding: var(--space-md); background: #27ae6010; border-radius: var(--radius-sm); border-left: 3px solid #27ae60; font-size: var(--text-sm); color: var(--color-text); }
.rec-detail { color: var(--color-text-secondary); font-weight: 400; }

.btn-view { font-size: var(--text-xs); color: var(--blue); font-weight: 500; }
.btn-view:hover { text-decoration: underline; }
.btn-analyze { font-size: var(--text-xs); color: var(--blue); background: none; border: 1px solid var(--blue); border-radius: var(--radius-sm); padding: 2px 8px; cursor: pointer; font-family: var(--font-body); }
.btn-analyze:hover { background: var(--color-primary-bg); }
</style>
