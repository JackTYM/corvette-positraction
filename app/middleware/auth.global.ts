export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/auth')) return
  const { user, refreshSession } = useAuth()
  if (!user.value) await refreshSession()
  if (!user.value) return navigateTo('/auth/sign-in')
})
