import type { Category } from '~/utils/catalog'

export interface WishlistItemRow {
  id: string
  user_id: string
  title: string
  category: string | null
  estimated_price: string | number | null
  source_url: string | null
  notes: string | null
  img_key: string | null
  source_variant_id: string | null
  is_rare: boolean
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  id: string
  title: string
  category: Category
  estimatedPrice: number
  sourceUrl: string
  notes: string
  imgKey: string | null
  sourceVariantId: string | null
  isRare: boolean
  createdAt: string
}

export function fromWishlistRow(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    title: row.title,
    category: (row.category ?? 'DIECAST') as Category,
    estimatedPrice: Number(row.estimated_price) || 0,
    sourceUrl: row.source_url ?? '',
    notes: row.notes ?? '',
    imgKey: row.img_key,
    sourceVariantId: row.source_variant_id,
    isRare: row.is_rare,
    createdAt: row.created_at,
  }
}

export function wishlistToPatch(input: Partial<WishlistItem>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.category !== undefined) patch.category = input.category
  if (input.estimatedPrice !== undefined) patch.estimated_price = input.estimatedPrice
  if (input.sourceUrl !== undefined) patch.source_url = input.sourceUrl
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.imgKey !== undefined) patch.img_key = input.imgKey
  if (input.sourceVariantId !== undefined) patch.source_variant_id = input.sourceVariantId
  if (input.isRare !== undefined) patch.is_rare = input.isRare
  return patch
}

export function useWishlist() {
  const neon = useNeon()
  const items = useState<WishlistItem[]>('wishlist:list', () => [])
  const loading = useState<boolean>('wishlist:loading', () => false)

  async function fetchAll() {
    loading.value = true
    const { data, error } = await neon.from('wishlist_items').select('*').order('created_at', { ascending: true })
    loading.value = false
    if (error) throw error
    items.value = (data as WishlistItemRow[]).map(fromWishlistRow)
  }

  async function create(input: Omit<WishlistItem, 'id'>) {
    const { data, error } = await neon.from('wishlist_items').insert(wishlistToPatch(input)).select().single()
    if (error) throw error
    const item = fromWishlistRow(data as WishlistItemRow)
    items.value = [...items.value, item]
    return item
  }

  async function update(id: string, patch: Partial<WishlistItem>) {
    const { data, error } = await neon.from('wishlist_items').update(wishlistToPatch(patch)).eq('id', id).select().single()
    if (error) throw error
    const updated = fromWishlistRow(data as WishlistItemRow)
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
