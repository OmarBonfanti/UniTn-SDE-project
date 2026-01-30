const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '/', component: () => import('pages/LandingPage.vue') },
      { path: '/Index', component: () => import('pages/IndexPage.vue') },
      { path: '/Scroll', component: () => import('pages/BookingProcess.vue') },
      { path: '/Thanks', component: () => import('pages/ThanksPage.vue') },
    ],
  },
  {
    path: '/base',
    component: () => import('layouts/BookingLayout.vue'),
    children: [
      { path: 'Map', component: () => import('pages/MapPage.vue') },
      { path: 'List', component: () => import('pages/ListPage.vue') },
      { path: 'Filters', component: () => import('pages/BookingPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
