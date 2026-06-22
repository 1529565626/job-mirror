<!-- ReportDetail.vue — 报告详情：左侧分析 + 右侧简历编辑器 -->
<template>
  <div class="report-detail">
    <LoadingSpinner v-if="store.loading && !store.current" text="加载报告..." />
    <ErrorState v-else-if="store.error && !store.current" :message="store.error" @retry="loadReport" />
    <EmptyState v-else-if="!store.current" icon="chart" title="报告不存在或已删除" />

    <div v-else class="report-layout">
      <!-- ====== 左侧：分析报告 ====== -->
      <div class="report-left">
        <button class="back-btn" @click="$router.push('/reports')">← 返回报告列表</button>
        <h2 class="column-title">分析报告</h2>

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
import { useRoute } from 'vue-router'
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
const modifications = ref({ changes: [], config: {} })
const appliedIndices = ref([])

const pickerVisible = ref(false)
const pickerSuggestion = ref('')
const pickerIndex = ref(-1)
const pickerSection = ref('')

const profile = computed(() => profileStore.data || {})

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
.report-layout { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2xl); padding: 0 var(--space-lg); height: calc(100vh - var(--header-height) - var(--space-xl) * 2); }
.report-left { display: flex; flex-direction: column; gap: var(--space-lg); min-width: 0; padding: 0 var(--space-sm) var(--space-md); overflow-y: auto; }
.report-right { display: flex; flex-direction: column; min-width: 0; padding: 0 var(--space-sm); }
.column-title { font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 700; color: var(--color-text); padding-bottom: var(--space-sm); border-bottom: 2px solid var(--yellow); margin-bottom: var(--space-md); }
.report-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-lg); align-items: start; }
.breakdown-items { display: flex; flex-direction: column; gap: var(--space-md); }
.breakdown-item { display: flex; flex-direction: column; gap: var(--space-xs); }
.bd-label { font-size: var(--text-sm); color: var(--color-text-secondary); }
.match-summary p { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; }
.back-btn { font-size: var(--text-sm); color: var(--blue); cursor: pointer; background: none; border: none; padding: 0; font-family: var(--font-body); }
.back-btn:hover { text-decoration: underline; }
@media (max-width: 1100px) { .report-layout { grid-template-columns: 1fr; height: auto; } .report-left, .report-right { overflow-y: visible; } }
</style>
