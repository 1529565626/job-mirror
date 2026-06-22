// router/index.js — 职镜路由配置
// 3 个一级路由 + 2 个子路由，共 5 个条目
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { title: '个人档案' }
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import('@/pages/JDPage.vue'),
    meta: { title: '岗位管理' }
  },
  {
    path: '/jobs/:id',
    name: 'jd-detail',
    component: () => import('@/components/jd/JDDetail.vue'),
    meta: { title: '岗位详情' }
  },
  {
    path: '/compare',
    name: 'compare',
    component: () => import('@/pages/ComparePage.vue'),
    meta: { title: '岗位对比' }
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/pages/ReportsPage.vue'),
    meta: { title: '分析报告' }
  },
  {
    path: '/reports/:id',
    name: 'report-detail',
    component: () => import('@/components/report/ReportDetail.vue'),
    meta: { title: '报告详情' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
