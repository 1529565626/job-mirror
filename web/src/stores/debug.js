// stores/debug.js — 调试模式全局开关
import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useDebugStore = defineStore('debug', {
  state: () => ({
    enabled: false,
    loading: true
  }),

  actions: {
    async fetch() {
      try {
        const res = await api.get('/api/settings/debug')
        if (res) this.enabled = !!res.enabled
      } catch {} finally { this.loading = false }
    },
    async toggle() {
      this.enabled = !this.enabled
      try { await api.put('/api/settings/debug', { enabled: this.enabled }) } catch {}
    }
  }
})
