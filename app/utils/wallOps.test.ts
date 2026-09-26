import { describe, it, expect } from 'vitest'
import { caseOffsets, moveInOrder, caseLetter, slotCode } from './wallOps'

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
