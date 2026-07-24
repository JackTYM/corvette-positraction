export interface WallCase { id: string; name: string; cols: number; rows: number }
export interface Wall { cases: WallCase[]; order: string[] }
export interface WallRow { user_id: string; cases: WallCase[]; item_order: string[]; updated_at: string }

export function rowToWall(row: WallRow | null): Wall {
  return row ? { cases: row.cases ?? [], order: row.item_order ?? [] } : { cases: [], order: [] }
}

export function useWall() {
  const neon = useNeon()
  const wall = useState<Wall>('wall:state', () => ({ cases: [], order: [] }))
  const loaded = useState<boolean>('wall:loaded', () => false)

  async function fetchWall() {
    const { data, error } = await neon.from('walls').select('*').maybeSingle()
    if (error) throw error
    wall.value = rowToWall(data as WallRow | null)
    loaded.value = true
  }

  async function saveWall(next: Wall) {
    wall.value = next
    const { error } = await neon.from('walls').upsert({ cases: next.cases, item_order: next.order })
    if (error) throw error
  }

  return { wall, loaded, fetchWall, saveWall }
}
