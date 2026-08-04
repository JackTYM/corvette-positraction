export interface DiecastModelRow {
  id: string
  manufacturer: string
  name: string
  source_url: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface DiecastModel { id: string; manufacturer: string; name: string; sourceUrl: string; coverImageUrl: string | null }

export function fromModelRow(row: DiecastModelRow): DiecastModel {
  return { id: row.id, manufacturer: row.manufacturer, name: row.name, sourceUrl: row.source_url, coverImageUrl: row.cover_image_url }
}

export interface DiecastVariantRow {
  id: string
  model_id: string
  caption: string | null
  image_url: string
  sort_order: number
  created_at: string
}

export interface DiecastVariant { id: string; modelId: string; caption: string | null; imageUrl: string; sortOrder: number }

export function fromVariantRow(row: DiecastVariantRow): DiecastVariant {
  return { id: row.id, modelId: row.model_id, caption: row.caption, imageUrl: row.image_url, sortOrder: row.sort_order }
}

export function useDiecastReference() {
  const neon = useNeon()

  async function fetchModels(manufacturer?: string): Promise<DiecastModel[]> {
    let query = neon.from('diecast_models').select('*').order('name', { ascending: true })
    if (manufacturer) query = query.eq('manufacturer', manufacturer)
    const { data, error } = await query
    if (error) throw error
    return (data as DiecastModelRow[]).map(fromModelRow)
  }

  async function fetchModel(id: string): Promise<DiecastModel | null> {
    const { data, error } = await neon.from('diecast_models').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? fromModelRow(data as DiecastModelRow) : null
  }

  async function fetchVariants(modelId: string): Promise<DiecastVariant[]> {
    const { data, error } = await neon.from('diecast_variants').select('*').eq('model_id', modelId).order('sort_order', { ascending: true })
    if (error) throw error
    return (data as DiecastVariantRow[]).map(fromVariantRow)
  }

  async function fetchVariant(id: string): Promise<DiecastVariant | null> {
    const { data, error } = await neon.from('diecast_variants').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? fromVariantRow(data as DiecastVariantRow) : null
  }

  async function fetchVariantModelIds(variantIds: string[]): Promise<{ id: string; modelId: string }[]> {
    if (!variantIds.length) return []
    const { data, error } = await neon.from('diecast_variants').select('id, model_id').in('id', variantIds)
    if (error) throw error
    return (data as { id: string; model_id: string }[]).map((r) => ({ id: r.id, modelId: r.model_id }))
  }

  return { fetchModels, fetchModel, fetchVariants, fetchVariant, fetchVariantModelIds }
}
