export default defineNuxtRouteMiddleware((to) => {
  if (typeof window === 'undefined') return
  if (!window.location.hostname.startsWith('share.')) return
  if (to.path.startsWith('/share/')) return
  return navigateTo(`/share${to.path}`, { replace: true })
})
