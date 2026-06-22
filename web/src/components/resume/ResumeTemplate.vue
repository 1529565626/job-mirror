<!-- ResumeTemplate.vue — 简历主模板：编排所有区块，内容与设计完全分离 -->
<template>
  <div class="resume-page" :data-template="templateName">
    <ResumeHeader :basic="profile.basic || {}" />
    <ResumeBasicInfo :basic="profile.basic || {}" />
    <ResumeSkillList :skills="profile.skills || []" />
    <ResumeExperienceList :experiences="profile.experiences || []" />
    <ResumeProjectList
      :projects="profile.projects || []"
      :sort-by="config.projectSort"
      :max-count="config.projectCount"
      :jd-keywords="jdKeywords"
    />
    <ResumeEducationList :education="profile.education || []" />
  </div>
</template>

<script setup>
import ResumeHeader from './ResumeHeader.vue'
import ResumeBasicInfo from './ResumeBasicInfo.vue'
import ResumeSkillList from './ResumeSkillList.vue'
import ResumeExperienceList from './ResumeExperienceList.vue'
import ResumeProjectList from './ResumeProjectList.vue'
import ResumeEducationList from './ResumeEducationList.vue'

defineProps({
  profile: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({ projectSort: 'chronological', projectCount: 'all' }) },
  jdKeywords: { type: Array, default: () => [] },
  templateName: { type: String, default: 'default' }
})
</script>
