<!-- JDDetail.vue — 岗位详情页 -->
<template>
  <div class="jd-detail">
    <div v-if="store.loading">
      <LoadingSpinner text="加载岗位详情..." />
    </div>

    <div v-else-if="store.error">
      <ErrorState :message="store.error" @retry="loadJD" />
    </div>

    <div v-else-if="!store.current" class="not-found">
      <EmptyState
        icon="briefcase"
        title="岗位不存在或已删除"
        description="该岗位可能已被删除"
      />
    </div>

    <article v-else class="jd-content">
      <button class="back-btn" @click="$router.push('/jobs')">← 返回岗位列表</button>

      <div class="jd-header-row">
        <h1 class="page-title">{{ store.current.parsed?.title || store.current.id }}</h1>
        <button
          v-if="!store.current.reportIds?.length && !store.current.parsed"
          class="btn btn-primary"
          @click="triggerAnalyze"
        >
          分析此岗位
        </button>
      </div>

      <section class="card raw-text">
        <h2 class="section-title">原始岗位描述</h2>
        <pre class="jd-text">{{ store.current.rawText }}</pre>
      </section>

      <!-- 已解析的结构化信息 -->
      <section v-if="store.current.parsed" class="card parsed-info">
        <h2 class="section-title">岗位要求解析</h2>

        <div v-if="store.current.parsed.requiredSkills?.length" class="jd-skills">
          <h3>技能要求</h3>
          <div class="tags">
            <span
              v-for="sk in store.current.parsed.requiredSkills"
              :key="sk.name"
              class="tag"
              :class="[sk.importance === 'required' ? 'tag-required' : 'tag-preferred', categoryTagClass(sk.category)]"
            >
              <span class="tag-cat-icon">{{ categoryIcon(sk.category) }}</span>
              {{ sk.name }}
              <span class="tag-level">{{ sk.level }}</span>
            </span>
          </div>
        </div>

        <div v-if="store.current.parsed.requiredExperience" class="jd-exp">
          <h3>经验要求</h3>
          <p>{{ store.current.parsed.requiredExperience.years || '?' }} 年经验</p>
        </div>

        <div v-if="store.current.parsed.responsibilities?.length" class="jd-duties">
          <h3>主要职责</h3>
          <ul>
            <li v-for="(r, i) in store.current.parsed.responsibilities" :key="i">{{ r }}</li>
          </ul>
        </div>

        <!-- 关联报告 -->
        <div v-if="store.current.reportIds?.length" class="jd-reports">
          <h3>分析报告</h3>
          <RouterLink
            v-for="rid in store.current.reportIds"
            :key="rid"
            :to="`/reports/${rid}`"
            class="report-link"
          >查看分析报告 →</RouterLink>
        </div>
      </section>
    </article>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useJDsStore } from '@/stores/jds'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const route = useRoute()
const router = useRouter()
const store = useJDsStore()

function loadJD() {
  const id = route.params.id
  if (id) store.fetchOne(id)
}

function triggerAnalyze() {
  const id = route.params.id
  if (id) router.push({ path: '/jobs', query: { analyze: id } })
}

function categoryIcon(cat) {
  return { hard: '🛠', soft: '🤝', industry: '📈' }[cat] || ''
}
function categoryTagClass(cat) {
  return cat ? 'tag-cat-' + cat : ''
}

onMounted(loadJD)
</script>

<style scoped>
.jd-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.jd-header-row .page-title { margin-bottom: 0; }
.back-btn {
  font-size: var(--text-sm);
  color: var(--color-primary);
  margin-bottom: var(--space-md);
  cursor: pointer;
}

.jd-content {
  max-width: 800px;
}

.raw-text {
  margin-bottom: var(--space-lg);
}

.jd-text {
  font-size: var(--text-sm);
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: var(--space-md);
  border-radius: var(--radius-sm);
}

.parsed-info h3 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  margin: var(--space-md) 0 var(--space-sm);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.tag-required {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.tag-preferred {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.tag-cat-icon { font-size: 0.7rem; }
.tag-cat-hard { border-left: 2px solid var(--blue); padding-left: 4px; }
.tag-cat-soft { border-left: 2px solid var(--color-success); padding-left: 4px; }
.tag-cat-industry { border-left: 2px solid var(--yellow); padding-left: 4px; }

.tag-level {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-left: 2px;
}

.jd-exp p,
.jd-duties li {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.jd-duties ul {
  list-style: disc;
  padding-left: var(--space-lg);
}

.jd-reports { margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-border); }
.jd-reports h3 { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-sm); }
.report-link { display: inline-block; font-size: var(--text-sm); color: var(--blue); font-weight: 500; padding: 4px 0; }
.report-link:hover { text-decoration: underline; }
</style>
