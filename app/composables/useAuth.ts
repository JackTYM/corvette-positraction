interface AuthUser {
  id: string
  email: string
  name?: string | null
}

// neon.auth.* rejects instead of resolving to { error } for HTTP-level failures
// (wrong password, duplicate email, network errors), so every call site must catch.
function toAuthError(err: unknown): { message: string } {
  if (err instanceof Error) return { message: err.message }
  return { message: 'Something went wrong. Please try again.' }
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const neon = useNeon()

  async function refreshSession() {
    const { data } = await neon.auth.getSession()
    user.value = data?.user ?? null
    return data?.user ?? null
  }

  async function signUp(email: string, password: string, name?: string) {
    try {
      // See signIn() below: use the user this response already returns instead of an extra
      // getSession() round trip, which can lose the race on iOS home-screen standalone PWAs.
      const { data, error } = await neon.auth.signUp.email(
        { email, password, name: name ?? '' },
        { signal: AbortSignal.timeout(10_000) },
      )
      if (error) return { error }
      user.value = data.user
      return { data }
    } catch (err) {
      return { error: toAuthError(err) }
    }
  }

  async function signIn(email: string, password: string) {
    try {
      // Use the user this response already returns instead of an extra getSession() round
      // trip: on iOS home-screen standalone PWAs that follow-up request can race ahead of
      // the session actually being persisted and come back empty, silently bouncing back to
      // the sign-in page even though sign-in itself succeeded.
      const { data, error } = await neon.auth.signIn.email({ email, password }, { signal: AbortSignal.timeout(10_000) })
      if (error) return { error }
      user.value = data.user
      return { data }
    } catch (err) {
      return { error: toAuthError(err) }
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await neon.auth.signIn.social({ provider: 'google', callbackURL: '/' })
      if (error) return { error }
    } catch (err) {
      return { error: toAuthError(err) }
    }
  }

  async function signOut() {
    await neon.auth.signOut()
    user.value = null
    await navigateTo('/auth/sign-in')
  }

  async function getJwt(): Promise<string | null> {
    const { data } = await neon.auth.getSession()
    return data?.session?.token ?? null
  }

  return { user, refreshSession, signUp, signIn, signInWithGoogle, signOut, getJwt }
}
