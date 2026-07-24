export interface LinkRow {
  id: string
  user_id: string
  item_id: string
  linked_item_id: string
  created_at: string
}

export interface ItemLink { id: string; itemId: string; linkedItemId: string }

export function fromLinkRow(row: LinkRow): ItemLink {
  return { id: row.id, itemId: row.item_id, linkedItemId: row.linked_item_id }
}

export function otherItemId(link: ItemLink, itemId: string): string {
  return link.itemId === itemId ? link.linkedItemId : link.itemId
}

export function useItemLinks() {
  const neon = useNeon()

  async function fetchForItem(itemId: string): Promise<ItemLink[]> {
    const [a, b] = await Promise.all([
      neon.from('item_links').select('*').eq('item_id', itemId),
      neon.from('item_links').select('*').eq('linked_item_id', itemId),
    ])
    if (a.error) throw a.error
    if (b.error) throw b.error
    const rows = [...(a.data as LinkRow[]), ...(b.data as LinkRow[])]
    return rows.map(fromLinkRow)
  }

  async function create(itemId: string, linkedItemId: string): Promise<ItemLink> {
    const { data, error } = await neon.from('item_links').insert({ item_id: itemId, linked_item_id: linkedItemId }).select().single()
    if (error) throw error
    return fromLinkRow(data as LinkRow)
  }

  async function remove(linkId: string): Promise<void> {
    const { error } = await neon.from('item_links').delete().eq('id', linkId)
    if (error) throw error
  }

  return { fetchForItem, create, remove }
}
