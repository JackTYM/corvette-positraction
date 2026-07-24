import { describe, it, expect } from 'vitest'
import { rowToWall, type WallRow } from './useWall'

describe('rowToWall', () => {
  it('maps item_order to order and passes cases through', () => {
    const row: WallRow = { user_id: 'u1', cases: [{ id: 'c1', name: 'Left', cols: 3, rows: 2 }], item_order: ['a', 'b'], updated_at: '' }
    expect(rowToWall(row)).toEqual({ cases: [{ id: 'c1', name: 'Left', cols: 3, rows: 2 }], order: ['a', 'b'] })
  })
  it('returns an empty wall for a null row (no saved wall yet)', () => {
    expect(rowToWall(null)).toEqual({ cases: [], order: [] })
  })
})
