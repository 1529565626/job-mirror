// stores/jds.js — 岗位列表 Pinia store
import { defineStore } from 'pinia'
import { api } from '@/services/api'

/** 从岗位标题生成 slug：去特殊字符，限制 20 字 */
function generateSlug(title) {
  if (!title || !title.trim()) return null
  const cleaned = title.trim().replace(/[^一-龥a-zA-Z0-9]/g, '')
  return cleaned.slice(0, 20) || null
}

/** 生成岗位 ID：YYYY-MM-DD-<slug> */
function generateId(title) {
  const date = new Date().toISOString().slice(0, 10)
  const slug = generateSlug(title)
  if (!slug) return null
  return `${date}-${slug}`
}

export const useJDsStore = defineStore('jds', {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => state.list.length === 0,
    count: (state) => state.list.length
  },

  actions: {
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        this.list = await api.get('/api/jds')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id) {
      this.loading = true
      try {
        this.current = await api.get(`/api/jds/${id}`)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    /** 创建新岗位，自动生成 ID。title 为空时返回 null */
    async create({ title, rawText }) {
      const id = generateId(title)
      if (!id) {
        this.error = '请填写岗位名称'
        return null
      }
      this.loading = true
      this.error = null
      const body = {
        id,
        title,
        rawText,
        createdAt: new Date().toISOString(),
        parsed: null,
        reportIds: []
      }
      try {
        await api.post('/api/jds', body)
        await this.fetchList()
        return id
      } catch (e) {
        this.error = e.message
        return null
      } finally {
        this.loading = false
      }
    },

    /** 保存 JD 分析状态（跨刷新持久化） */
    async saveAnalysisState(state) {
      try { await api.put('/api/inbox/jd-analysis-state', state) } catch {}
    },

    /** 读取 JD 分析状态 */
    async getAnalysisState() {
      try { return await api.get('/api/inbox/jd-analysis-state') } catch { return null }
    },

    /** 清除 JD 分析状态 */
    async clearAnalysisState() {
      try { await api.delete('/api/inbox/jd-analysis-state') } catch {}
    },

    async remove(id) {
      await api.delete(`/api/jds/${id}`)
      this.list = this.list.filter(j => j.id !== id)
    }
  }
})
