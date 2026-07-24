import { describe, it, expect } from 'vitest'
import { fromLinkRow, otherItemId, type LinkRow } from './useItemLinks'

const row: LinkRow = { id: 'link-1', user_id: 'user-1', item_id: 'item-a', linked_item_id: 'item-b', created_at: '2020-01-01T00:00:00Z' }

describe('fromLinkRow', () => {
  it('maps snake_case DB columns to the camelCase ItemLink shape', () => {
    expect(fromLinkRow(row)).toEqual({ id: 'link-1', itemId: 'item-a', linkedItemId: 'item-b' })
  })
})

describe('otherItemId', () => {
  const link = fromLinkRow(row)
  it('returns the linked item when given the origin item', () => {
    expect(otherItemId(link, 'item-a')).toBe('item-b')
  })
  it('returns the origin item when given the linked item', () => {
    expect(otherItemId(link, 'item-b')).toBe('item-a')
  })
})
