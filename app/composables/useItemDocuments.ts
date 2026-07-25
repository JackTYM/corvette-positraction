export interface DocumentRow {
  id: string
  user_id: string
  item_id: string
  key: string
  filename: string
  mime_type: string
  size: number
  created_at: string
}

export interface ItemDocument { id: string; itemId: string; key: string; filename: string; mimeType: string; size: number }

export function fromDocumentRow(row: DocumentRow): ItemDocument {
  return { id: row.id, itemId: row.item_id, key: row.key, filename: row.filename, mimeType: row.mime_type, size: row.size }
}

export function useItemDocuments() {
  const neon = useNeon()

  async function fetchForItem(itemId: string): Promise<ItemDocument[]> {
    const { data, error } = await neon.from('item_documents').select('*').eq('item_id', itemId).order('created_at', { ascending: true })
    if (error) throw error
    return (data as DocumentRow[]).map(fromDocumentRow)
  }

  async function create(itemId: string, doc: { key: string; filename: string; mimeType: string; size: number }): Promise<ItemDocument> {
    const { data, error } = await neon.from('item_documents').insert({
      item_id: itemId, key: doc.key, filename: doc.filename, mime_type: doc.mimeType, size: doc.size,
    }).select().single()
    if (error) throw error
    return fromDocumentRow(data as DocumentRow)
  }

  async function remove(documentId: string): Promise<void> {
    const { error } = await neon.from('item_documents').delete().eq('id', documentId)
    if (error) throw error
  }

  return { fetchForItem, create, remove }
}
