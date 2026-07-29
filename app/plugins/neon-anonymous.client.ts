// NeonPostgrestClient/fetchWithToken are @neondatabase/postgrest-js's low-level engine that
// @neondatabase/neon-js's own createClient() builds on internally, not that package's primary
// documented entry point. Both packages are pinned as betas. If this file breaks after a
// @neondatabase/neon-js or @neondatabase/postgrest-js upgrade, start by checking whether
// NeonPostgrestClient's constructor shape or fetchWithToken's signature/retry semantics changed.
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
    const res = await fetch(`${authUrl}/token/anonymous`, { credentials: 'omit', signal: AbortSignal.timeout(5000) })
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

  // Any failure in here (network error, timed-out/failed token fetch, a non-2xx response) is
  // normalized into a `{ error }` result by postgrest-js's own PostgrestBuilder, which wraps
  // this fetch chain in its default catch -- do not add another try/catch around this function,
  // it would change the error shape callers (see useSharedCollection.ts's `if (error) throw
  // error` pattern) already rely on.
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
