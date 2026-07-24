import { describe, it, expect } from 'vitest'
import { fromRow, toPatch, type ItemRow } from './useItems'

const row: ItemRow = {
  id: 'id-1', user_id: 'user-1', title: 'Sting Ray', sub: 'Riverside Red', category: 'DIECAST',
  generation: 'C2', year: 1963, scale: '1:18', maker: 'AUTOart', acquired: '1963-01-01',
  price_paid: '95.00', value: '285.00', value_as_of: '2026-01-01', value_source: 'Hagerty',
  condition: 'Mint', location: 'Cabinet A', story: '…',
  featured: false, color_name: 'Riverside Red', color_hex: '#B11A1A', img_key: 'user-1/abc.webp',
  production_date: '1963-06-01', rarity: 2, attributes: { toyNumber: 'HW-12' },
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('fromRow', () => {
  it('maps snake_case DB columns to the camelCase Item shape', () => {
    expect(fromRow(row)).toEqual({
      id: 'id-1', title: 'Sting Ray', sub: 'Riverside Red', category: 'DIECAST', generation: 'C2',
      year: 1963, scale: '1:18', maker: 'AUTOart', acquired: '1963-01-01', pricePaid: 95,
      value: 285, valueAsOf: '2026-01-01', valueSource: 'Hagerty', condition: 'Mint',
      location: 'Cabinet A', story: '…', featured: false,
      colorName: 'Riverside Red', colorHex: '#B11A1A', imgKey: 'user-1/abc.webp',
      productionDate: '1963-06-01', rarity: 2, attributes: { toyNumber: 'HW-12' },
    })
  })
  it('defaults null price/value/attributes to 0/empty and null img_key stays null', () => {
    const sparse = { ...row, price_paid: null, value: null, img_key: null, value_as_of: null, value_source: null, production_date: null, rarity: null, attributes: null }
    const mapped = fromRow(sparse)
    expect(mapped.pricePaid).toBe(0)
    expect(mapped.value).toBe(0)
    expect(mapped.imgKey).toBeNull()
    expect(mapped.valueAsOf).toBe('')
    expect(mapped.rarity).toBeNull()
    expect(mapped.attributes).toEqual({})
  })
})

describe('toPatch', () => {
  it('maps only the provided camelCase fields to snake_case columns', () => {
    expect(toPatch({ pricePaid: 100, colorHex: '#FF0000' })).toEqual({ price_paid: 100, color_hex: '#FF0000' })
  })
  it('omits fields that were not provided', () => {
    expect(toPatch({ title: 'New Title' })).toEqual({ title: 'New Title' })
  })
  it('converts empty year/acquired to null', () => {
    expect(toPatch({ year: '', acquired: '' })).toEqual({ year: null, acquired: null })
  })
  it('maps the new common fields and attributes', () => {
    expect(toPatch({ valueAsOf: '2026-01-01', valueSource: 'eBay comp', productionDate: '', rarity: 3, attributes: { redline: true } }))
      .toEqual({ value_as_of: '2026-01-01', value_source: 'eBay comp', production_date: null, rarity: 3, attributes: { redline: true } })
  })
})
