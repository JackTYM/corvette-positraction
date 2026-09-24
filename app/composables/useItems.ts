import type { Item } from '~/utils/catalog'

export interface ItemRow {
  id: string
  user_id: string
  title: string
  sub: string | null
  category: string | null
  generation: string | null
  year: number | null
  scale: string | null
  maker: string | null
  acquired: string | null
  price_paid: string | number | null
  value: string | number | null
  value_as_of: string | null
  value_source: string | null
  condition: string | null
  location: string | null
  story: string | null
  featured: boolean
  color_name: string | null
  color_hex: string | null
  img_key: string | null
  source_variant_id: string | null
  production_date: string | null
  rarity: number | null
  attributes: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function fromRow(row: ItemRow): Item {
  return {
    id: row.id,
    title: row.title,
    sub: row.sub ?? '',
    category: (row.category ?? 'DIECAST') as Item['category'],
    generation: (row.generation ?? '—') as Item['generation'],
    year: row.year ?? '',
    scale: row.scale ?? '',
    maker: row.maker ?? '',
    acquired: row.acquired ?? '',
    pricePaid: Number(row.price_paid) || 0,
    value: Number(row.value) || 0,
    valueAsOf: row.value_as_of ?? '',
    valueSource: row.value_source ?? '',
    condition: row.condition ?? '',
    location: row.location ?? '',
    story: row.story ?? '',
    featured: row.featured,
    colorName: row.color_name ?? '',
    colorHex: row.color_hex ?? '',
    imgKey: row.img_key,
    sourceVariantId: row.source_variant_id ?? null,
    productionDate: row.production_date ?? '',
    rarity: row.rarity ?? null,
    attributes: row.attributes ?? {},
    createdAt: row.created_at,
  }
}

export function toPatch(input: Partial<Item>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.sub !== undefined) patch.sub = input.sub
  if (input.category !== undefined) patch.category = input.category
  if (input.generation !== undefined) patch.generation = input.generation
  if (input.year !== undefined) patch.year = input.year || null
  if (input.scale !== undefined) patch.scale = input.scale
  if (input.maker !== undefined) patch.maker = input.maker
  if (input.acquired !== undefined) patch.acquired = input.acquired || null
  if (input.pricePaid !== undefined) patch.price_paid = input.pricePaid
  if (input.value !== undefined) patch.value = input.value
  if (input.valueAsOf !== undefined) patch.value_as_of = input.valueAsOf || null
  if (input.valueSource !== undefined) patch.value_source = input.valueSource
  if (input.condition !== undefined) patch.condition = input.condition
  if (input.location !== undefined) patch.location = input.location
  if (input.story !== undefined) patch.story = input.story
  if (input.featured !== undefined) patch.featured = input.featured
  if (input.colorName !== undefined) patch.color_name = input.colorName
  if (input.colorHex !== undefined) patch.color_hex = input.colorHex
  if (input.imgKey !== undefined) patch.img_key = input.imgKey
  if (input.sourceVariantId !== undefined) patch.source_variant_id = input.sourceVariantId
  if (input.productionDate !== undefined) patch.production_date = input.productionDate || null
  if (input.rarity !== undefined) patch.rarity = input.rarity
  if (input.attributes !== undefined) patch.attributes = input.attributes
  return patch
}

export function useItems() {
  const neon = useNeon()
  const items = useState<Item[]>('items:list', () => [])
  const loading = useState<boolean>('items:loading', () => false)

  async function fetchAll() {
    loading.value = true
    const { data, error } = await neon.from('items').select('*').order('created_at', { ascending: false })
    loading.value = false
    if (error) throw error
    items.value = (data as ItemRow[]).map(fromRow)
  }

  async function create(input: Omit<Item, 'id'>) {
    const { data, error } = await neon.from('items').insert(toPatch(input)).select().single()
    if (error) throw error
    const item = fromRow(data as ItemRow)
    items.value = [item, ...items.value]
    return item
  }

  async function update(id: string, patch: Partial<Item>) {
    const { data, error } = await neon.from('items').update(toPatch(patch)).eq('id', id).select().single()
    if (error) throw error
    const updated = fromRow(data as ItemRow)
    items.value = items.value.map((i) => (i.id === id ? updated : i))
    return updated
  }

  async function remove(id: string) {
    const { error } = await neon.from('items').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
}
