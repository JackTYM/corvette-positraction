interface AuthUser {
  id: string
  email: string
  name?: string | null
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
    const { data, error } = await neon.auth.signUp.email({ email, password, name: name ?? '' })
    if (error) return { error }
    await refreshSession()
    return { data }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await neon.auth.signIn.email({ email, password })
    if (error) return { error }
    await refreshSession()
    return { data }
  }

  async function signInWithGoogle() {
    await neon.auth.signIn.social({ provider: 'google', callbackURL: '/' })
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
