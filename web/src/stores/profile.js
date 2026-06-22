// stores/profile.js — 用户档案 Pinia store
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    data: null,        // profile.json 完整内容
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => !state.data || (
      (state.data.skills || []).length === 0 &&
      (state.data.experiences || []).length === 0 &&
      (state.data.education || []).length === 0
    ),

    skillCount: (state) => state.data?.skills?.length || 0,

    // 按分类分组的技能列表，供雷达图等使用
    skillsByCategory: (state) => {
      if (!state.data?.skills) return {}
      return state.data.skills.reduce((acc, s) => {
        (acc[s.category] ||= []).push(s)
        return acc
      }, {})
    }
  },

  actions: {
    async fetch() {
      this.loading = true
      this.error = null
      try {
        this.data = await api.get('/api/profile')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    /** 将提取的简历文本保存到收件箱，供 Claude Code 解析 */
    async saveResume(rawText) {
      this.error = null
      try {
        await api.put('/api/inbox/resume', { rawText })
        return true
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    /** 上传原始简历文件二进制（用于"查看源文件"内嵌展示） */
    async saveResumeFile(base64, fileName, fileType) {
      try {
        await api.upload('/api/inbox/resume/file', { data: base64, fileName, fileType })
        return true
      } catch (e) {
        console.error('上传原始文件失败:', e.message)
        return false
      }
    },

    /** 获取原始文件信息 */
    async fetchResumeFile() {
      try {
        return await api.get('/api/inbox/resume/file')
      } catch {
        return null
      }
    },

    /** 保存导入状态（跨刷新持久化） */
    async saveImportState(state) {
      try {
        await api.put('/api/inbox/import-state', state)
      } catch { /* 静默失败，不影响主流程 */ }
    },

    /** 读取导入状态 */
    async getImportState() {
      try {
        return await api.get('/api/inbox/import-state')
      } catch {
        return null
      }
    },

    /** 清除导入状态 */
    async clearImportState() {
      try {
        await api.delete('/api/inbox/import-state')
      } catch { /* 静默 */ }
    },

    /** 清空档案及收件箱 */
    async clearAll() {
      try {
        await api.delete('/api/profile')
        this.data = null
        this.error = null
        return true
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    /** 检查收件箱状态 */
    async checkInboxStatus() {
      try {
        return await api.get('/api/inbox/status')
      } catch {
        return { exists: false, processed: false }
      }
    },

    /** 获取原始简历文本，用于"查看源文件" */
    async fetchResumeText() {
      try {
        return await api.get('/api/inbox/resume')
      } catch {
        return null
      }
    },

    /** 保存档案编辑 */
    async updateProfile(data) {
      this.error = null
      try {
        await api.put('/api/profile', data)
        this.data = data
        return true
      } catch (e) {
        this.error = e.message
        return false
      }
    }
  }
})
