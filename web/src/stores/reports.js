// stores/reports.js — 分析报告 Pinia store
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useReportsStore = defineStore('reports', {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    error: null
  }),

  getters: {
    isEmpty: (state) => state.list.length === 0,
    latest: (state) => state.list[0] || null,

    // 按匹配度分组的计数
    scoreDistribution: (state) => ({
      high: state.list.filter(r => r.overallScore >= 80).length,
      medium: state.list.filter(r => r.overallScore >= 50 && r.overallScore < 80).length,
      low: state.list.filter(r => r.overallScore < 50).length
    })
  },

  actions: {
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        this.list = await api.get('/api/reports')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id) {
      this.loading = true
      try {
        this.current = await api.get(`/api/reports/${id}`)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async remove(id) {
      await api.delete(`/api/reports/${id}`)
      this.list = this.list.filter(r => r.id !== id)
    }
  }
})
