import { describe, it, expect } from 'vitest'
import { fromWishlistRow, wishlistToPatch, type WishlistItemRow } from './useWishlist'

const row: WishlistItemRow = {
  id: 'wish-1', user_id: 'user-1', title: 'Corvette C8 1:18', estimated_price: '150.00',
  source_url: 'https://smalldiecastcorvettes.com/car/334_HW_CORVETTE_C7_Z06.html', notes: 'Waiting for a sale',
  img_key: 'user-1/abc.jpg', source_variant_id: 'variant-1', category: 'TRACK CAR',
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('fromWishlistRow', () => {
  it('maps snake_case DB columns to the camelCase WishlistItem shape', () => {
    expect(fromWishlistRow(row)).toEqual({
      id: 'wish-1', title: 'Corvette C8 1:18', estimatedPrice: 150,
      sourceUrl: 'https://smalldiecastcorvettes.com/car/334_HW_CORVETTE_C7_Z06.html',
      notes: 'Waiting for a sale', imgKey: 'user-1/abc.jpg', sourceVariantId: 'variant-1',
      category: 'TRACK CAR', createdAt: '2020-01-01T00:00:00Z',
    })
  })
  it('defaults null price/text fields for a manual entry with no source', () => {
    const manual = { ...row, estimated_price: null, source_url: null, notes: null, img_key: null, source_variant_id: null }
    const mapped = fromWishlistRow(manual)
    expect(mapped.estimatedPrice).toBe(0)
    expect(mapped.sourceUrl).toBe('')
    expect(mapped.notes).toBe('')
    expect(mapped.imgKey).toBeNull()
    expect(mapped.sourceVariantId).toBeNull()
  })
  it('defaults a null category to DIECAST, for rows that predate the category column', () => {
    expect(fromWishlistRow({ ...row, category: null }).category).toBe('DIECAST')
  })
})

describe('wishlistToPatch', () => {
  it('maps only the provided camelCase fields to snake_case columns', () => {
    expect(wishlistToPatch({ title: 'New Title', estimatedPrice: 200 })).toEqual({ title: 'New Title', estimated_price: 200 })
  })
  it('omits fields that were not provided', () => {
    expect(wishlistToPatch({ notes: 'A note' })).toEqual({ notes: 'A note' })
  })
  it('maps category through when provided', () => {
    expect(wishlistToPatch({ category: 'DISPLAY MODELS' })).toEqual({ category: 'DISPLAY MODELS' })
  })
})
