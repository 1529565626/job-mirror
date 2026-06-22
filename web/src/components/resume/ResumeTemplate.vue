<!-- ResumeTemplate.vue — 3套布局：专业型/现代型/简洁型 -->
<template>
  <!-- 专业型：经典单栏 -->
  <div v-if="templateName === 'professional'" class="resume-page resume-professional">
    <ResumeHeader :basic="profile.basic || {}" :education="profile.education || []" />
    <ResumeSkillList :skills="profile.skills || []" />
    <ResumeExperienceList :experiences="profile.experiences || []" />
    <ResumeProjectList :projects="profile.projects || []" :sort-by="config.projectSort" :max-count="config.projectCount" :jd-keywords="jdKeywords" />
    <ResumeEducationList :education="profile.education || []" />
  </div>

  <!-- 现代型：左深色侧栏 + 右主内容 -->
  <div v-else-if="templateName === 'modern'" class="resume-page resume-modern">
    <div class="modern-sidebar">
      <div class="modern-sidebar-name">{{ profile.basic?.name || '未命名' }}</div>
      <div class="modern-sidebar-role">{{ profile.basic?.currentRole || '' }}</div>
      <div class="modern-sidebar-info">
        <div v-if="profile.basic?.industry">{{ profile.basic.industry }}</div>
        <div v-if="profile.basic?.yearsOfExperience">{{ profile.basic.yearsOfExperience }}年经验</div>
        <div v-if="topDegree">{{ topDegree }}</div>
      </div>
      <div class="modern-skills">
        <h3 class="modern-section-title">技能</h3>
        <div v-for="(skills, cat) in skillsGrouped" :key="cat" class="modern-skill-group">
          <p class="modern-skill-cat">{{ cat }}</p>
          <div class="modern-skill-tags">
            <span v-for="s in skills" :key="s.name" class="modern-skill-tag">{{ s.name }}</span>
          </div>
        </div>
      </div>
      <div v-if="meaningfulEdu.length" class="modern-edu">
        <h3 class="modern-section-title">教育</h3>
        <div v-for="(e, i) in meaningfulEdu" :key="i" class="modern-edu-item">
          <div class="modern-edu-school">{{ e.school }}</div>
          <div class="modern-edu-meta">{{ e.degree }} · {{ e.major }}</div>
        </div>
      </div>
    </div>
    <div class="modern-main">
      <div v-if="profile.basic?.summary" class="modern-summary">{{ profile.basic.summary }}</div>
      <h3 class="modern-section-title">工作经历</h3>
      <div v-for="(e, i) in profile.experiences" :key="i" class="modern-card">
        <div class="modern-card-header">
          <span class="modern-card-role">{{ e.role }}</span>
          <span class="modern-card-company">{{ e.company }}</span>
          <span class="modern-card-date">{{ fmtDate(e.duration) }}</span>
        </div>
        <p v-if="e.description" class="modern-card-desc">{{ e.description }}</p>
        <ul v-if="e.highlights?.length" class="modern-highlights">
          <li v-for="(h, j) in e.highlights" :key="j">{{ h }}</li>
        </ul>
      </div>
      <h3 v-if="sortedProjects.length" class="modern-section-title">项目经历</h3>
      <div v-for="(p, i) in sortedProjects" :key="i" class="modern-card">
        <div class="modern-card-header">
          <span class="modern-card-role">{{ p.name }}</span>
          <span class="modern-card-company">{{ p.role }}</span>
        </div>
        <p v-if="p.description" class="modern-card-desc">{{ p.description }}</p>
        <ul v-if="p.highlights?.length" class="modern-highlights">
          <li v-for="(h, j) in p.highlights" :key="j">{{ h }}</li>
        </ul>
        <div v-if="p.techStack?.length" class="modern-tech-tags">
          <span v-for="t in p.techStack.slice(0, 6)" :key="t" class="modern-tech-tag">{{ t }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 简洁型：极简单栏 -->
  <div v-else class="resume-page resume-minimal">
    <div class="minimal-header">
      <h1 class="minimal-name">{{ profile.basic?.name || '未命名' }}</h1>
      <p class="minimal-meta">
        <span v-if="profile.basic?.currentRole">{{ profile.basic.currentRole }}</span>
        <span v-if="profile.basic?.yearsOfExperience" class="minimal-sep">|</span>
        <span v-if="profile.basic?.yearsOfExperience">{{ profile.basic.yearsOfExperience }}年</span>
        <span v-if="profile.basic?.industry" class="minimal-sep">|</span>
        <span v-if="profile.basic?.industry">{{ profile.basic.industry }}</span>
        <span v-if="topDegree" class="minimal-sep">|</span>
        <span v-if="topDegree">{{ topDegree }}</span>
      </p>
    </div>
    <p v-if="profile.basic?.summary" class="minimal-summary">{{ profile.basic.summary }}</p>

    <h2 class="minimal-section-title">工作经历</h2>
    <div v-for="(e, i) in profile.experiences" :key="i" class="minimal-card">
      <div class="minimal-card-row">
        <strong>{{ e.role }}</strong>
        <span class="minimal-dot">·</span>
        <span>{{ e.company }}</span>
        <span class="minimal-date">{{ fmtDate(e.duration) }}</span>
      </div>
      <ul v-if="e.highlights?.length" class="minimal-hl">
        <li v-for="(h, j) in e.highlights" :key="j">{{ h }}</li>
      </ul>
    </div>

    <h2 v-if="sortedProjects.length" class="minimal-section-title">项目经历</h2>
    <div v-for="(p, i) in sortedProjects" :key="i" class="minimal-card">
      <div class="minimal-card-row">
        <strong>{{ p.name }}</strong>
        <span v-if="p.role" class="minimal-dot">·</span>
        <span v-if="p.role">{{ p.role }}</span>
      </div>
      <ul v-if="p.highlights?.length" class="minimal-hl">
        <li v-for="(h, j) in p.highlights" :key="j">{{ h }}</li>
      </ul>
    </div>

    <h2 class="minimal-section-title">技能</h2>
    <div class="minimal-skills">
      <span v-for="s in profile.skills" :key="s.name" class="minimal-skill-item">
        {{ s.name }}<span v-if="s.yearsUsed" class="minimal-skill-yr"> {{ s.yearsUsed }}y</span>
      </span>
    </div>

    <div v-if="meaningfulEdu.length">
      <h2 class="minimal-section-title">教育</h2>
      <p v-for="(e, i) in meaningfulEdu" :key="i" class="minimal-edu-line">
        {{ e.school }} · {{ e.degree }} · {{ e.major }} <span v-if="e.graduationYear">{{ e.graduationYear }}年</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ResumeHeader from './ResumeHeader.vue'
import ResumeSkillList from './ResumeSkillList.vue'
import ResumeExperienceList from './ResumeExperienceList.vue'
import ResumeProjectList from './ResumeProjectList.vue'
import ResumeEducationList from './ResumeEducationList.vue'

const props = defineProps({
  profile: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  jdKeywords: { type: Array, default: () => [] },
  templateName: { type: String, default: 'professional' }
})

const degreeOrder = { '博士': 5, '硕士': 4, 'MBA': 4, '本科': 3, '大专': 2, '高中': 1 }
const topDegree = computed(() => {
  const edu = props.profile.education || []
  if (!edu.length) return ''
  return edu.sort((a, b) => (degreeOrder[b.degree] || 0) - (degreeOrder[a.degree] || 0))[0]?.degree || ''
})

const meaningfulEdu = computed(() => (props.profile.education || []).filter(e => e.school || e.major))

const skillsGrouped = computed(() => {
  if (!props.profile.skills?.length) return {}
  return props.profile.skills.reduce((acc, s) => {
    (acc[s.category || '其他'] ||= []).push(s)
    return acc
  }, {})
})

const sortedProjects = computed(() => {
  const list = [...(props.profile.projects || [])]
  if (props.config.projectSort === 'relevance' && props.jdKeywords.length) {
    list.sort((a, b) => {
      const ha = [a.name, a.description, (a.techStack || []).join(' ')].join(' ').toLowerCase()
      const hb = [b.name, b.description, (b.techStack || []).join(' ')].join(' ').toLowerCase()
      let sa = 0, sb = 0
      props.jdKeywords.forEach(k => { const kl = k.toLowerCase(); if (ha.includes(kl)) sa += 2; if (hb.includes(kl)) sb += 2 })
      return sb - sa
    })
  } else {
    list.sort((a, b) => (b.duration?.start || '').localeCompare(a.duration?.start || ''))
  }
  const max = props.config.projectCount
  return max && max !== 'all' ? list.slice(0, Number(max)) : list
})

function fmtDate(d) {
  if (!d?.start) return ''
  return d.start + ' — ' + (d.end || '至今')
}
</script>
