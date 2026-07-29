import { NeonPostgrestClient, fetchWithToken } from '@neondatabase/postgrest-js'

interface AnonymousTokenResponse {
  token: string
  expires_at: number
}

// Fetches a genuinely anonymous Data API token directly from the auth service's
// anonymous-token endpoint, entirely independent of @neondatabase/neon-js's
// createClient(). That wrapper's token resolution always prefers an active
// browser session's JWT over an anonymous token when one exists — allowAnonymous
// is only a fallback for "no session at all", not a way to force anonymity. For
// the public share view, a visitor logged in as *any* account must still be
// treated as anonymous, so we bypass the session-aware auth wrapper completely.
function createAnonymousAuth(authUrl: string) {
  let cached: { token: string; expiresAt: number } | null = null

  async function getToken(): Promise<string | null> {
    if (cached && cached.expiresAt - 30_000 > Date.now()) return cached.token
    const res = await fetch(`${authUrl}/token/anonymous`, { credentials: 'omit' })
    if (!res.ok) return null
    const data = (await res.json()) as AnonymousTokenResponse
    cached = { token: data.token, expiresAt: data.expires_at * 1000 }
    return cached.token
  }

  function invalidate() {
    cached = null
  }

  return { getToken, invalidate }
}

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()
  const anonymousAuth = createAnonymousAuth(cfg.public.neonAuthUrl)
  const authFetch = fetchWithToken(anonymousAuth.getToken)

  const neonAnonymous = new NeonPostgrestClient({
    dataApiUrl: cfg.public.neonDataApiUrl,
    options: {
      global: {
        fetch: async (input, init) => {
          const response = await authFetch(input, init)
          if (response.status !== 401) return response
          anonymousAuth.invalidate()
          return authFetch(input, init)
        },
      },
    },
  })

  return { provide: { neonAnonymous } }
})
