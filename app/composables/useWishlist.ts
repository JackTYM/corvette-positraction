export interface WishlistItemRow {
  id: string
  user_id: string
  title: string
  estimated_price: string | number | null
  source_url: string | null
  notes: string | null
  img_key: string | null
  source_variant_id: string | null
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  id: string
  title: string
  estimatedPrice: number
  sourceUrl: string
  notes: string
  imgKey: string | null
  sourceVariantId: string | null
}

export function fromRow(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    title: row.title,
    estimatedPrice: Number(row.estimated_price) || 0,
    sourceUrl: row.source_url ?? '',
    notes: row.notes ?? '',
    imgKey: row.img_key,
    sourceVariantId: row.source_variant_id,
  }
}

export function toPatch(input: Partial<WishlistItem>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.estimatedPrice !== undefined) patch.estimated_price = input.estimatedPrice
  if (input.sourceUrl !== undefined) patch.source_url = input.sourceUrl
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.imgKey !== undefined) patch.img_key = input.imgKey
  if (input.sourceVariantId !== undefined) patch.source_variant_id = input.sourceVariantId
  return patch
}

export function useWishlist() {
  const neon = useNeon()
  const items = useState<WishlistItem[]>('wishlist:list', () => [])
  const loading = useState<boolean>('wishlist:loading', () => false)

  async function fetchAll() {
    loading.value = true
    const { data, error } = await neon.from('wishlist_items').select('*').order('created_at', { ascending: false })
    loading.value = false
    if (error) throw error
    items.value = (data as WishlistItemRow[]).map(fromRow)
  }

  async function create(input: Omit<WishlistItem, 'id'>) {
    const { data, error } = await neon.from('wishlist_items').insert(toPatch(input)).select().single()
    if (error) throw error
    const item = fromRow(data as WishlistItemRow)
    items.value = [item, ...items.value]
    return item
  }

  async function update(id: string, patch: Partial<WishlistItem>) {
    const { data, error } = await neon.from('wishlist_items').update(toPatch(patch)).eq('id', id).select().single()
    if (error) throw error
    const updated = fromRow(data as WishlistItemRow)
    items.value = items.value.map((i) => (i.id === id ? updated : i))
    return updated
  }

  async function remove(id: string) {
    const { error } = await neon.from('wishlist_items').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
}
