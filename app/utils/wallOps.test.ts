import { describe, it, expect } from 'vitest'
import { caseOffsets, moveInOrder, fileByComparator, arrangeSlice, caseLetter, slotCode, countMoved } from './wallOps'
import { ARRANGE, type Item } from './catalog'

function item(id: string, year: number): Item {
  return {
    id, title: id, sub: '', category: 'DIECAST', generation: '—', year, scale: '', maker: '',
    acquired: '', pricePaid: 0, value: 0, valueAsOf: '', valueSource: '', productionDate: '', rarity: null,
    condition: '', location: '', story: '', featured: false,
    colorName: '', colorHex: '', imgKey: null, attributes: {}, sourceVariantId: null,
    createdAt: '2020-01-01T00:00:00Z',
  }
}

describe('caseOffsets', () => {
  it('returns cumulative starting offsets for each case', () => {
    expect(caseOffsets([6, 8, 4])).toEqual([0, 6, 14])
  })
})

describe('moveInOrder', () => {
  it('moves an item to a new position, cascading everything after it', () => {
    expect(moveInOrder(['a', 'b', 'c', 'd'], 'd', 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('clamps the target position to the array bounds', () => {
    expect(moveInOrder(['a', 'b'], 'a', 99)).toEqual(['b', 'a'])
  })
  it('is a no-op position-wise when the item is dropped where it already is', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('fileByComparator', () => {
  it('inserts the item at the position its comparator value dictates', () => {
    const byId = { a: item('a', 1963), b: item('b', 1990), new: item('new', 1980) }
    expect(fileByComparator(['a', 'b'], byId, 'new', ARRANGE.release)).toEqual(['a', 'new', 'b'])
  })
})

describe('arrangeSlice', () => {
  it('sorts only the given slice, leaving items outside it untouched', () => {
    const byId = { a: item('a', 1990), b: item('b', 1963), c: item('c', 2020), d: item('d', 1950) }
    expect(arrangeSlice(['a', 'b', 'c', 'd'], byId, 0, 2, ARRANGE.release)).toEqual(['b', 'a', 'c', 'd'])
  })
})

describe('caseLetter', () => {
  it('labels the first 26 cases A through Z', () => {
    expect(caseLetter(0)).toBe('A')
    expect(caseLetter(25)).toBe('Z')
  })
  it('continues past Z as AA, AB, ...', () => {
    expect(caseLetter(26)).toBe('AA')
    expect(caseLetter(27)).toBe('AB')
  })
})

describe('slotCode', () => {
  it('builds a {letter}-{row}-{space} code from a zero-based slot index', () => {
    expect(slotCode(0, 4, 6)).toBe('A-1-5')
    expect(slotCode(0, 6, 6)).toBe('A-2-1')
    expect(slotCode(1, 0, 4)).toBe('B-1-1')
  })
})

describe('countMoved', () => {
  it('returns 0 when the order is unchanged', () => {
    expect(countMoved(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0)
  })
  it('counts every position whose id changed', () => {
    expect(countMoved(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(2)
  })
  it('treats a position past the shorter array\'s end as changed', () => {
    expect(countMoved(['a'], ['a', 'b'])).toBe(1)
  })
})
