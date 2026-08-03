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
      const { data, error } = await neon.auth.signUp.email({ email, password, name: name ?? '' })
      if (error) return { error }
      await refreshSession()
      return { data }
    } catch (err) {
      return { error: toAuthError(err) }
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await neon.auth.signIn.email({ email, password })
      if (error) return { error }
      await refreshSession()
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
