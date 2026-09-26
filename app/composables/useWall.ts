export type WallKind = 'garage' | 'showroom'

export interface WallCase { id: string; name: string; cols: number; rows: number }
export interface Wall { cases: WallCase[]; order: string[] }
export interface WallRow { user_id: string; kind: WallKind; cases: WallCase[]; item_order: string[]; updated_at: string }

export function rowToWall(row: WallRow | null): Wall {
  return row ? { cases: row.cases ?? [], order: row.item_order ?? [] } : { cases: [], order: [] }
}

export function useWall(kind: WallKind) {
  const neon = useNeon()
  const wall = useState<Wall>(`wall:${kind}:state`, () => ({ cases: [], order: [] }))
  const loaded = useState<boolean>(`wall:${kind}:loaded`, () => false)

  async function fetchWall() {
    const { data, error } = await neon.from('walls').select('*').eq('kind', kind).maybeSingle()
    if (error) throw error
    wall.value = rowToWall(data as WallRow | null)
    loaded.value = true
  }

  async function saveWall(next: Wall) {
    wall.value = next
    const { error } = await neon.from('walls').upsert({ kind, cases: next.cases, item_order: next.order })
    if (error) throw error
  }

  return { wall, loaded, fetchWall, saveWall }
}
