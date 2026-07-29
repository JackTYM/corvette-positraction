// Public/anonymous-capable client — for the public share views only. Never use this for
// private, session-scoped pages: unlike useNeon(), it silently falls back to an anonymous
// request instead of failing when there's no session (see neon-anonymous.client.ts).
export function useNeonAnonymous() {
  return useNuxtApp().$neonAnonymous
}
