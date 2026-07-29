export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/auth')) return
  if (to.path.startsWith('/share')) return
  if (typeof window !== 'undefined' && window.location.hostname.startsWith('share.')) return
  const { user, refreshSession } = useAuth()
  if (!user.value) await refreshSession()
  if (!user.value) return navigateTo('/auth/sign-in')
})
