import { describe, it, expect } from 'vitest'
import {
  fmtMoney, fmtDate, stats, colorKey, ARRANGE, isCar, CATEGORY_FIELDS, extractYearFromName, type Item,
  freshAttributeFilters, matchesAttributeField, matchesAttributeFilters, emptyTopLevelFilters, matchesTopLevelFilters,
  type FieldDef,
} from './catalog'

function item(overrides: Partial<Item>): Item {
  return {
    id: 'x', title: 'T', sub: '', category: 'DIECAST', generation: 'C2', year: 1963,
    scale: '1:18', maker: 'M', acquired: '2020-01-01', pricePaid: 10, value: 20,
    valueAsOf: '', valueSource: '', productionDate: '', rarity: null,
    condition: '', location: '', story: '', featured: false,
    colorName: 'Red', colorHex: '#B11A1A', imgKey: null, attributes: {}, sourceVariantId: null, ...overrides,
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
  it('gates the Diecast Wheel Type free-text field behind the Other / Custom option', () => {
    const wheelTypeOther = CATEGORY_FIELDS.DIECAST.find((f) => f.key === 'wheelTypeOther')
    expect(wheelTypeOther?.showWhen).toEqual({ key: 'wheelType', equals: 'Other / Custom' })
  })
})

describe('freshAttributeFilters', () => {
  it('gives number/date fields a range shape and everything else an empty string', () => {
    const fields: FieldDef[] = [
      { key: 'a', label: 'A', type: 'text' },
      { key: 'b', label: 'B', type: 'number' },
      { key: 'c', label: 'C', type: 'date' },
      { key: 'd', label: 'D', type: 'select', options: ['X'] },
      { key: 'e', label: 'E', type: 'checkbox' },
    ]
    expect(freshAttributeFilters(fields)).toEqual({
      a: '', b: { min: '', max: '' }, c: { from: '', to: '' }, d: '', e: '',
    })
  })
})

describe('matchesAttributeField', () => {
  it('text: matches a case-insensitive substring, empty filter matches anything', () => {
    expect(matchesAttributeField('text', 'Redline Special', 'red')).toBe(true)
    expect(matchesAttributeField('text', 'Redline Special', 'blue')).toBe(false)
    expect(matchesAttributeField('text', 'Redline Special', '')).toBe(true)
  })
  it('select: requires exact match, empty filter matches anything', () => {
    expect(matchesAttributeField('select', 'Redline', 'Redline')).toBe(true)
    expect(matchesAttributeField('select', 'Redline', 'Basic Wheels')).toBe(false)
    expect(matchesAttributeField('select', 'Redline', '')).toBe(true)
  })
  it('checkbox: filters on the stringified boolean, empty filter matches anything', () => {
    expect(matchesAttributeField('checkbox', true, 'true')).toBe(true)
    expect(matchesAttributeField('checkbox', false, 'true')).toBe(false)
    expect(matchesAttributeField('checkbox', false, 'false')).toBe(true)
    expect(matchesAttributeField('checkbox', true, '')).toBe(true)
  })
  it('number: honors min/max bounds and excludes missing values when a bound is set', () => {
    expect(matchesAttributeField('number', 5, { min: '3', max: '10' })).toBe(true)
    expect(matchesAttributeField('number', 2, { min: '3', max: '10' })).toBe(false)
    expect(matchesAttributeField('number', 11, { min: '3', max: '10' })).toBe(false)
    expect(matchesAttributeField('number', '', { min: '3', max: '' })).toBe(false)
    expect(matchesAttributeField('number', 5, { min: '', max: '' })).toBe(true)
  })
  it('date: honors from/to bounds', () => {
    expect(matchesAttributeField('date', '2020-06-01', { from: '2020-01-01', to: '2020-12-31' })).toBe(true)
    expect(matchesAttributeField('date', '2019-06-01', { from: '2020-01-01', to: '2020-12-31' })).toBe(false)
    expect(matchesAttributeField('date', '', { from: '2020-01-01', to: '' })).toBe(false)
  })
})

describe('matchesAttributeFilters', () => {
  const fields: FieldDef[] = [
    { key: 'wheelType', label: 'Wheel Type', type: 'select', options: ['Redline', 'Basic Wheels'] },
    { key: 'toyNumber', label: 'Toy #', type: 'text' },
  ]
  it('AND-combines every field filter', () => {
    const it1 = item({ attributes: { wheelType: 'Redline', toyNumber: '9876' } })
    const filters = freshAttributeFilters(fields)
    filters.wheelType = 'Redline'
    filters.toyNumber = '987'
    expect(matchesAttributeFilters(it1, fields, filters)).toBe(true)
    filters.toyNumber = 'zzz'
    expect(matchesAttributeFilters(it1, fields, filters)).toBe(false)
  })
})

describe('matchesTopLevelFilters', () => {
  it('AND-combines maker, condition, generation, rarity, value range, and acquired range', () => {
    const it1 = item({ maker: 'AUTOart', condition: 'Mint', generation: 'C2', rarity: 3, value: 200, acquired: '2021-05-01' })
    const filters = emptyTopLevelFilters()
    expect(matchesTopLevelFilters(it1, filters)).toBe(true)
    filters.maker = 'auto'
    filters.generation = 'C2'
    filters.rarityMin = 2
    filters.valueMin = '100'
    filters.valueMax = '300'
    filters.acquiredFrom = '2021-01-01'
    filters.acquiredTo = '2021-12-31'
    expect(matchesTopLevelFilters(it1, filters)).toBe(true)
    filters.generation = 'C4'
    expect(matchesTopLevelFilters(it1, filters)).toBe(false)
  })
})

describe('extractYearFromName', () => {
  it('extracts a confident 4-digit year', () => {
    expect(extractYearFromName('1953 corvette')).toBe(1953)
    expect(extractYearFromName('1997 corvette')).toBe(1997)
  })
  it('returns null for ambiguous 2-digit year-like names', () => {
    expect(extractYearFromName('63 corvette')).toBeNull()
    expect(extractYearFromName('09 corvette stingray concept')).toBeNull()
  })
  it('returns null when there is no year at all', () => {
    expect(extractYearFromName('custom corvette')).toBeNull()
  })
})
