export function useShareSettings() {
  const neon = useNeon()
  const shareEnabled = useState<boolean>('share-settings:enabled', () => false)
  const loaded = useState<boolean>('share-settings:loaded', () => false)

  async function fetchSettings() {
    const { data, error } = await neon.from('user_settings').select('*').maybeSingle()
    if (error) throw error
    shareEnabled.value = (data as { share_enabled: boolean } | null)?.share_enabled ?? false
    loaded.value = true
  }

  async function setShareEnabled(next: boolean) {
    const { data: existing, error: selectError } = await neon.from('user_settings').select('user_id').maybeSingle()
    if (selectError) throw selectError
    if (existing) {
      const { error } = await neon.from('user_settings').update({ share_enabled: next }).eq('user_id', (existing as { user_id: string }).user_id)
      if (error) throw error
    } else {
      const { error } = await neon.from('user_settings').insert({ share_enabled: next })
      if (error) throw error
    }
    shareEnabled.value = next
  }

  return { shareEnabled, loaded, fetchSettings, setShareEnabled }
}
