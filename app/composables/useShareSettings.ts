export interface UserSettingsRow {
  user_id: string
  share_enabled: boolean
}

export function useShareSettings() {
  const neon = useNeon()
  const shareEnabled = useState<boolean>('share-settings:enabled', () => false)
  const loaded = useState<boolean>('share-settings:loaded', () => false)

  async function fetchSettings() {
    const { data, error } = await neon.from('user_settings').select('*').maybeSingle()
    if (error) throw error
    shareEnabled.value = (data as UserSettingsRow | null)?.share_enabled ?? false
    loaded.value = true
  }

  async function setShareEnabled(next: boolean) {
    const { error } = await neon.from('user_settings').upsert({ share_enabled: next })
    if (error) throw error
    shareEnabled.value = next
  }

  return { shareEnabled, loaded, fetchSettings, setShareEnabled }
}
