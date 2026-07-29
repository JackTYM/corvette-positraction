import { fromRow, type ItemRow } from '~/composables/useItems'
import { fromLinkRow, otherItemId, type ItemLink, type LinkRow } from '~/composables/useItemLinks'
import { fromDocumentRow, type ItemDocument, type DocumentRow } from '~/composables/useItemDocuments'
import { fromWishlistRow, type WishlistItem, type WishlistItemRow } from '~/composables/useWishlist'
import type { Item } from '~/utils/catalog'

export function useSharedCollection(userId: string) {
  const neon = useNeonAnonymous()
  const items = useState<Item[]>(`shared:${userId}:items`, () => [])
  const wishlistItems = useState<WishlistItem[]>(`shared:${userId}:wishlist`, () => [])

  async function fetchItems() {
    const { data, error } = await neon.from('items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    items.value = (data as ItemRow[]).map(fromRow)
  }

  async function fetchWishlistItems() {
    const { data, error } = await neon.from('wishlist_items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    wishlistItems.value = (data as WishlistItemRow[]).map(fromWishlistRow)
  }

  async function fetchLinksForItem(itemId: string): Promise<ItemLink[]> {
    const [a, b] = await Promise.all([
      neon.from('item_links').select('*').eq('item_id', itemId).order('created_at', { ascending: true }),
      neon.from('item_links').select('*').eq('linked_item_id', itemId).order('created_at', { ascending: true }),
    ])
    if (a.error) throw a.error
    if (b.error) throw b.error
    const rows = [...(a.data as LinkRow[]), ...(b.data as LinkRow[])]
    const seen = new Set<string>()
    return rows.map(fromLinkRow).filter((link) => (seen.has(link.id) ? false : (seen.add(link.id), true)))
  }

  async function fetchDocumentsForItem(itemId: string): Promise<ItemDocument[]> {
    const { data, error } = await neon.from('item_documents').select('*').eq('item_id', itemId).order('created_at', { ascending: true })
    if (error) throw error
    return (data as DocumentRow[]).map(fromDocumentRow)
  }

  return { items, wishlistItems, fetchItems, fetchWishlistItems, fetchLinksForItem, fetchDocumentsForItem, otherItemId }
}
