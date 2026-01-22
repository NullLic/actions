import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/actions/',
      name: 'home',
      component: () => import('../pages/ThreePage.vue'),
    },
    {
      path: '/earth',
      name: 'earth',
      component: () => import('../pages/EarthCloudPage.vue'),
    }
  ],
})

export default router
