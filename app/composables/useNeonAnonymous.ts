// Always-anonymous client — for the public share views only. Unlike useNeon(), it never
// reads or falls back to the browser's real session JWT, even if the visitor happens to be
// logged in as some other account: it fetches its own anonymous token directly and ignores
// session state entirely (see neon-anonymous.client.ts). Never use this for private,
// session-scoped pages — it can't authenticate as a real user.
export function useNeonAnonymous() {
  return useNuxtApp().$neonAnonymous
}
