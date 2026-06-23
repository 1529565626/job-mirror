<!-- ReportDetail.vue — 报告详情：左侧分析 + 右侧简历编辑器 -->
<template>
  <div class="report-detail">
    <LoadingSpinner v-if="store.loading && !store.current" text="加载报告..." />
    <ErrorState v-else-if="store.error && !store.current" :message="store.error" @retry="loadReport" />
    <EmptyState v-else-if="!store.current" icon="chart" title="报告不存在或已删除" />

    <div v-else class="report-layout" :class="{ 'panel-open': panelOpen }">
      <!-- ====== 左侧：分析报告 ====== -->
      <div class="report-left">
        <button class="back-btn" @click="$router.push('/reports')">← 返回报告列表</button>
        <h2 class="column-title">
          分析报告
          <RouterLink v-if="store.current.jdId" :to="`/jobs/${store.current.jdId}`" class="jd-link">查看原始岗位 →</RouterLink>
        </h2>

        <div class="report-grid">
          <MatchScore v-if="store.current.match" :score="store.current.match.overallScore" />
          <div v-if="store.current.match?.breakdown" class="card breakdown-card">
            <h2 class="section-title">维度得分</h2>
            <div class="breakdown-items">
              <div class="breakdown-item">
                <span class="bd-label">技能匹配</span>
                <ProgressBar :value="store.current.match.breakdown.skillMatch" :label="store.current.match.breakdown.skillMatch + '%'" color="var(--blue)" />
              </div>
              <div class="breakdown-item">
                <span class="bd-label">经验匹配</span>
                <ProgressBar :value="store.current.match.breakdown.experienceMatch" :label="store.current.match.breakdown.experienceMatch + '%'" color="var(--color-success)" />
              </div>
              <div class="breakdown-item">
                <span class="bd-label">学历匹配</span>
                <ProgressBar :value="store.current.match.breakdown.educationMatch" :label="store.current.match.breakdown.educationMatch + '%'" color="var(--color-accent)" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="store.current.match?.summary" class="card match-summary">
          <p>{{ store.current.match.summary }}</p>
          <div
            v-if="store.current.match?.weightAdjustment"
            class="weight-notice"
          >⚠️ 评分说明：{{ store.current.match.weightAdjustmentReason || '检测到特殊场景，评分权重已调整。' }}</div>
        </div>

        <SkillGapChart v-if="store.current.skillAnalysis?.length" :skills="store.current.skillAnalysis" />
        <GapBreakdown v-if="store.current.skillAnalysis?.length" :analysis="store.current.skillAnalysis" />

        <Suggestions
          v-if="store.current.resumeSuggestions?.length"
          :suggestions="store.current.resumeSuggestions"
          :applied-indices="appliedIndices"
          @apply="onApplySuggestion"
          @undo="onUndoSuggestion"
        />

        <!-- 面试准备区（STAR 故事 + 包装话术） -->
        <section v-if="store.current.interviewPrep?.length" class="card interview-prep">
          <h2 class="section-title">面试准备</h2>
          <div
            v-for="(item, idx) in store.current.interviewPrep"
            :key="idx"
            class="interview-card"
            :class="'importance-' + item.importance"
          >
            <div class="interview-header">
              <span class="importance-dot" :class="'dot-' + item.importance"></span>
              <span class="interview-topic">{{ item.topic }}</span>
            </div>

            <!-- STAR 故事 -->
            <div v-if="item.starStory" class="star-story">
              <div class="star-title">STAR 故事模板</div>
              <div class="star-grid">
                <div class="star-cell"><span class="star-tag s-tag">S 背景</span>{{ item.starStory.situation }}</div>
                <div class="star-cell"><span class="star-tag t-tag">T 任务</span>{{ item.starStory.task }}</div>
                <div class="star-cell"><span class="star-tag a-tag">A 行动</span>{{ item.starStory.action }}</div>
                <div class="star-cell"><span class="star-tag r-tag">R 结果</span>{{ item.starStory.result }}</div>
              </div>
              <div v-if="item.sourceExperience" class="star-source">来源：{{ item.sourceExperience }}</div>
            </div>

            <!-- 准备要点 -->
            <ul v-if="item.prepPoints?.length" class="prep-list">
              <li v-for="(p, pi) in item.prepPoints" :key="pi">{{ p }}</li>
            </ul>
          </div>
        </section>

        <!-- 技能差距包装话术（gapStory） -->
        <section v-if="gapStories.length" class="card gap-stories">
          <h2 class="section-title">差距应答策略</h2>
          <div v-for="gs in gapStories" :key="gs.skillName" class="gap-story-card">
            <div class="gs-skill">{{ gs.skillName }}</div>
            <div class="gs-strategy">{{ gs.gapStory.strategy }}</div>
            <div class="gs-response">
              <span class="gs-label">参考回答</span>
              <p>{{ gs.gapStory.sampleResponse }}</p>
            </div>
          </div>
        </section>

        <!-- 高频面试题预测 -->
        <section v-if="store.current.predictedQuestions?.length" class="card predicted-questions">
          <h2 class="section-title">高频面试题预测</h2>
          <div
            v-for="(q, qi) in store.current.predictedQuestions"
            :key="qi"
            class="predicted-item"
          >
            <div class="pq-question">Q{{ qi + 1 }} {{ q.question }}</div>
            <div class="pq-reason">为什么问：{{ q.whyThisQuestion }}</div>
            <div class="pq-meta">
              <span><strong>关联经历：</strong>{{ q.relatedExperience }}</span>
              <span><strong>答题框架：</strong>{{ q.suggestedFramework }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- ====== 右侧：简历编辑 & 预览 ====== -->
      <div class="report-right">
        <h2 class="column-title">简历编辑 & 预览</h2>
        <ResumePanel
          ref="resumePanelRef"
          :report-id="store.current.id"
          :profile="profile"
          :suggestions="store.current.resumeSuggestions || []"
          :saved-changes="modifications.changes || []"
          :saved-config="modifications.config || {}"
          @save-changes="onSaveChanges"
          @update-config="onSaveConfig"
          @changes-updated="onChangesUpdated"
        />
      </div>
    </div>

    <!-- 面板展开/收起：悬停交界处浮现 -->
    <div v-if="store.current" class="toggle-wrapper" :class="{ open: panelOpen }">
      <div class="toggle-sensor"></div>
      <button
        class="panel-toggle-btn"
        @click="panelOpen = !panelOpen"
      >
        <span class="toggle-icon">{{ panelOpen ? '▶' : '◀' }}</span>
        <span class="toggle-text">{{ panelOpen ? '收起' : '简历编辑' }}</span>
      </button>
    </div>

    <ProjectPickerModal
      :visible="pickerVisible"
      :projects="profile.projects || []"
      :suggestion="pickerSuggestion"
      @select="onProjectSelected"
      @close="pickerVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useReportsStore } from '@/stores/reports'
import { useProfileStore } from '@/stores/profile'
import { api } from '@/services/api'
import MatchScore from './MatchScore.vue'
import SkillGapChart from './SkillGapChart.vue'
import GapBreakdown from './GapBreakdown.vue'
import Suggestions from './Suggestions.vue'
import ResumePanel from './ResumePanel.vue'
import ProjectPickerModal from './ProjectPickerModal.vue'
import ProgressBar from '@/components/shared/ProgressBar.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const route = useRoute()
const store = useReportsStore()
const profileStore = useProfileStore()

const resumePanelRef = ref(null)
const panelOpen = ref(true)
const modifications = ref({ changes: [], config: {} })
const appliedIndices = ref([])

const pickerVisible = ref(false)
const pickerSuggestion = ref('')
const pickerIndex = ref(-1)
const pickerSection = ref('')

const profile = computed(() => profileStore.data || {})

const gapStories = computed(() =>
  (store.current?.skillAnalysis || [])
    .filter(s => s.gapStory && (s.match === 'partial' || s.match === 'missing'))
)

function loadReport() { const id = route.params.id; if (id) { store.fetchOne(id); loadModifications(id) } }
async function loadModifications(id) { try { const d = await api.get(`/api/reports/${id}/modifications`); if (d) modifications.value = d } catch {} }
async function onSaveChanges(changes) { modifications.value.changes = changes; try { await api.put(`/api/reports/${store.current.id}/modifications`, modifications.value) } catch {} }
async function onSaveConfig(config) { modifications.value.config = config; try { await api.put(`/api/reports/${store.current.id}/modifications`, modifications.value) } catch {} }

function onApplySuggestion(index, section, summary, snippet) {
  if (section === '项目经历' && profile.value.projects?.length) {
    pickerIndex.value = index; pickerSection.value = section; pickerSuggestion.value = snippet; pickerVisible.value = true; return
  }
  resumePanelRef.value?.applySuggestion(index, section, summary, snippet)
}
function onUndoSuggestion(index) { resumePanelRef.value?.undoSuggestion(index) }
function onProjectSelected(project) { pickerVisible.value = false; resumePanelRef.value?.applyToProject(pickerIndex.value, pickerSection.value, pickerSuggestion.value, project) }
function onChangesUpdated(mapped) { appliedIndices.value = mapped.map(c => c.suggestionIndex) }

watch(() => route.params.id, (n) => { if (n) loadReport() })
onMounted(() => { profileStore.fetch(); loadReport() })
</script>

<style scoped>
/* 双栏 flex 布局，右面板至少 1/3 宽度 */
.report-layout {
  display: flex;
  gap: 0;
  padding: 0 var(--space-lg);
  height: calc(100vh - var(--header-height) - var(--space-xl) * 2);
  transition: gap 0.35s ease;
}
.report-layout.panel-open { gap: var(--space-2xl); }
.report-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-lg); padding: 0 var(--space-sm) var(--space-md); overflow-y: auto; }
.report-right {
  flex: 0 0 0;
  overflow: hidden; opacity: 0;
  display: flex; flex-direction: column; min-width: 0; padding: 0;
  transition: flex-basis 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}
.report-layout.panel-open .report-right {
  flex: 0 0 33.333%;
  min-width: 360px;
  opacity: 1;
  padding: 0 var(--space-sm);
}

/* 悬停包裹器：固定右边缘 / 面板打开时移到交界处 */
.toggle-wrapper {
  position: fixed;
  right: 0;
  top: var(--header-height);
  bottom: 0;
  width: 36px;
  z-index: 99;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.toggle-wrapper.open {
  right: auto;
  left: calc(66.667% - 18px);
}
.toggle-sensor {
  position: absolute;
  inset: 0;
}

/* 按钮默认隐藏，悬停包裹器或按钮自身时浮现 */
.panel-toggle-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 10px 16px 12px;
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 40px 0 0 40px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: -2px 0 14px rgba(43, 127, 216, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.25s ease, padding 0.25s ease, border-radius 0.25s ease;
}
.toggle-wrapper:hover .panel-toggle-btn,
.panel-toggle-btn:hover {
  opacity: 1;
  pointer-events: auto;
}
.panel-toggle-btn:hover {
  transform: translateY(-50%) scale(1.1);
  padding-right: 16px;
}
.toggle-wrapper.open .panel-toggle-btn {
  right: auto;
  left: 0;
  border-radius: 0 40px 40px 0;
  padding: 16px 12px 16px 10px;
}
.toggle-wrapper.open .panel-toggle-btn:hover {
  padding-left: 16px;
}
.toggle-icon { font-size: 0.75rem; line-height: 1; }
.toggle-text {
  writing-mode: vertical-rl;
  letter-spacing: 0.12em;
  line-height: 1;
}

@media (max-width: 1100px) {
  .toggle-wrapper { display: none; }
}
.column-title { font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 700; color: var(--color-text); padding-bottom: var(--space-sm); border-bottom: 2px solid var(--yellow); margin-bottom: var(--space-md); display: flex; align-items: baseline; justify-content: space-between; }
.jd-link { font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500; color: var(--blue); }
.jd-link:hover { text-decoration: underline; }
.report-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-lg); align-items: start; }
.breakdown-items { display: flex; flex-direction: column; gap: var(--space-md); }
.breakdown-item { display: flex; flex-direction: column; gap: var(--space-xs); }
.bd-label { font-size: var(--text-sm); color: var(--color-text-secondary); }
.match-summary p { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; }
.match-summary p { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; }
.weight-notice {
  margin-top: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: rgba(244, 215, 88, 0.12);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  border-left: 3px solid var(--yellow);
  line-height: 1.5;
}

/* Interview Prep */
.interview-card {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-md);
  border-left: 3px solid var(--color-border);
}
.importance-high { border-left-color: var(--color-danger); background: var(--color-danger-bg); }
.importance-medium { border-left-color: var(--color-warning); background: var(--color-warning-bg); }
.importance-low { border-left-color: var(--color-primary); background: var(--color-primary-bg); }
.interview-header { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm); }
.importance-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-high { background: var(--color-danger); }
.dot-medium { background: var(--color-warning); }
.dot-low { background: var(--color-primary); }
.interview-topic { font-weight: 700; color: var(--color-text); font-size: var(--text-sm); }

.star-story { margin: var(--space-sm) 0; }
.star-title { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); margin-bottom: var(--space-xs); text-transform: uppercase; }
.star-grid { display: flex; flex-direction: column; gap: var(--space-xs); background: var(--color-surface); border-radius: var(--radius-sm); padding: var(--space-sm); border: 1px solid var(--color-border); }
.star-cell { font-size: var(--text-sm); color: var(--color-text); line-height: 1.5; display: flex; gap: var(--space-sm); }
.star-tag { font-size: var(--text-xs); font-weight: 700; padding: 1px 6px; border-radius: var(--radius-sm); white-space: nowrap; min-width: 44px; text-align: center; }
.s-tag { background: #E84A5F20; color: var(--red); }
.t-tag { background: #F4D75830; color: #8B7A10; }
.a-tag { background: #2B7FD820; color: var(--blue); }
.r-tag { background: #27AE6020; color: var(--color-success); }
.star-source { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-xs); font-style: italic; }

.prep-list { list-style: disc; padding-left: var(--space-lg); margin-top: var(--space-xs); }
.prep-list li { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; }

/* Gap Stories */
.gap-story-card {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  border-left: 2px solid var(--blue);
  margin-bottom: var(--space-sm);
}
.gs-skill { font-weight: 700; font-size: var(--text-sm); color: var(--color-text); margin-bottom: var(--space-xs); }
.gs-strategy { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; margin-bottom: var(--space-sm); }
.gs-response { background: var(--color-surface); padding: var(--space-sm); border-radius: var(--radius-sm); border: 1px solid var(--color-border); }
.gs-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); display: block; margin-bottom: var(--space-xs); }
.gs-response p { font-size: var(--text-sm); color: var(--color-text); line-height: 1.6; font-style: italic; }

/* Predicted Questions */
.predicted-item {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  border-left: 3px solid var(--blue);
  margin-bottom: var(--space-md);
}
.pq-question { font-weight: 700; font-size: var(--text-sm); color: var(--color-text); margin-bottom: var(--space-xs); }
.pq-reason { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-sm); }
.pq-meta { display: flex; flex-direction: column; gap: var(--space-xs); font-size: var(--text-xs); color: var(--color-text-secondary); }
.pq-meta strong { color: var(--color-text); }
.back-btn { font-size: var(--text-sm); color: var(--blue); cursor: pointer; background: none; border: none; padding: 0; font-family: var(--font-body); }
.back-btn:hover { text-decoration: underline; }
@media (max-width: 1100px) {
  .report-layout { flex-direction: column; height: auto; gap: var(--space-lg); }
  .report-layout.panel-open { gap: var(--space-lg); }
  .report-layout .report-right,
  .report-layout.panel-open .report-right { width: 100%; opacity: 1; padding: 0 var(--space-sm); overflow: visible; }
  .report-left, .report-right { overflow-y: visible; }
}
</style>
