import { describe, it, expect } from 'vitest'
import { fmtMoney, fmtDate, stats, colorKey, ARRANGE, isCar, CATEGORY_FIELDS, type Item } from './catalog'

function item(overrides: Partial<Item>): Item {
  return {
    id: 'x', title: 'T', sub: '', category: 'DIECAST', generation: 'C2', year: 1963,
    scale: '1:18', maker: 'M', acquired: '2020-01-01', pricePaid: 10, value: 20,
    valueAsOf: '', valueSource: '', productionDate: '', rarity: null,
    condition: '', location: '', story: '', featured: false,
    colorName: 'Red', colorHex: '#B11A1A', imgKey: null, attributes: {}, ...overrides,
  }
}

describe('fmtMoney', () => {
  it('formats with a dollar sign and no decimals', () => {
    expect(fmtMoney(1234.5)).toBe('$1,235')
  })
  it('treats null/undefined as zero', () => {
    expect(fmtMoney(null)).toBe('$0')
  })
})

describe('fmtDate', () => {
  it('formats an ISO date as "Mon D, YYYY"', () => {
    expect(fmtDate('1967-01-01')).toBe('Jan 1, 1967')
  })
  it('returns an em dash for empty input', () => {
    expect(fmtDate('')).toBe('—')
  })
})

describe('stats', () => {
  it('aggregates total, value, generations, and year span', () => {
    const items = [item({ year: 1963, value: 100, generation: 'C2' }), item({ year: 1990, value: 50, generation: 'C4' })]
    expect(stats(items)).toEqual({ total: 2, value: 150, paid: 20, gens: 2, earliest: 1963, latest: 1990 })
  })
})

describe('colorKey', () => {
  it('sorts neutrals after saturated colors', () => {
    const red = colorKey(item({ colorHex: '#FF0000' }))
    const grey = colorKey(item({ colorHex: '#888888' }))
    expect(grey).toBeGreaterThan(red)
  })
})

describe('ARRANGE.release', () => {
  it('sorts by year ascending', () => {
    const items = [item({ year: 1990 }), item({ year: 1963 })]
    expect([...items].sort(ARRANGE.release).map((i) => i.year)).toEqual([1963, 1990])
  })
})

describe('ARRANGE.value', () => {
  it('sorts by value descending', () => {
    const items = [item({ value: 10 }), item({ value: 50 })]
    expect([...items].sort(ARRANGE.value).map((i) => i.value)).toEqual([50, 10])
  })
})

describe('isCar', () => {
  it('is true for DIECAST and SPECIALTY CAR', () => {
    expect(isCar(item({ category: 'DIECAST' }))).toBe(true)
    expect(isCar(item({ category: 'SPECIALTY CAR' }))).toBe(true)
  })
  it('is false for paper ephemera', () => {
    expect(isCar(item({ category: 'BROCHURE' }))).toBe(false)
  })
})

describe('CATEGORY_FIELDS', () => {
  it('includes the Manufacturer Collector Number field for Diecast', () => {
    expect(CATEGORY_FIELDS.DIECAST.some((f) => f.key === 'manufacturerCollectorNumber')).toBe(true)
  })
  it('has no extra fields for Brochure (Year/Generation are common fields)', () => {
    expect(CATEGORY_FIELDS.BROCHURE).toEqual([])
  })
})
