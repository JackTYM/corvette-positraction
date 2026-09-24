export type Generation = 'C1'|'C2'|'C3'|'C4'|'C5'|'C6'|'C7'|'C8'|'—'

export const GENERATIONS: Record<Exclude<Generation,'—'>, { years: string; name: string }> = {
  C1: { years: '1953–1962', name: 'The Original' },
  C2: { years: '1963–1967', name: 'Sting Ray' },
  C3: { years: '1968–1982', name: 'Stingray' },
  C4: { years: '1984–1996', name: 'The Reborn' },
  C5: { years: '1997–2004', name: 'The Refined' },
  C6: { years: '2005–2013', name: 'The Bold' },
  C7: { years: '2014–2019', name: 'The Modern' },
  C8: { years: '2020–Now', name: 'Mid-Engine' },
}

export type Category =
  | 'DIECAST' | 'BROCHURE' | 'ADVERTISEMENT' | 'BADGE' | 'PATCH' | 'PHOTO' | 'BOOK' | 'ART'
  | 'SPECIALTY CAR' | 'OTHER COLLECTABLES' | 'INSTRUCTIONAL CD' | 'MUSIC CD' | 'LITHOGRAPHIC TIN'
  | 'MAGAZINE' | 'AUTO PART' | 'OWNERS MANUAL' | 'HUBCAP'

export const CATEGORIES: Record<Category, 'orange'|'ink'> = {
  'DIECAST': 'orange', 'BROCHURE': 'ink', 'ADVERTISEMENT': 'orange', 'BADGE': 'ink',
  'PATCH': 'orange', 'PHOTO': 'ink', 'BOOK': 'orange', 'ART': 'ink',
  'SPECIALTY CAR': 'orange', 'OTHER COLLECTABLES': 'ink', 'INSTRUCTIONAL CD': 'orange',
  'MUSIC CD': 'ink', 'LITHOGRAPHIC TIN': 'orange', 'MAGAZINE': 'ink', 'AUTO PART': 'orange',
  'OWNERS MANUAL': 'ink', 'HUBCAP': 'orange',
}

export interface Item {
  id: string
  title: string
  sub: string
  category: Category
  generation: Generation
  year: number | ''
  scale: string
  maker: string
  acquired: string
  pricePaid: number
  value: number
  valueAsOf: string
  valueSource: string
  productionDate: string
  rarity: number | null
  condition: string
  location: string
  story: string
  featured: boolean
  colorName: string
  colorHex: string
  imgKey: string | null
  attributes: Record<string, unknown>
  sourceVariantId: string | null
}

export interface WallCard extends Item { owned: boolean }

export const fmtMoney = (n: number | null | undefined): string =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

export function extractYearFromName(name: string): number | null {
  const match = name.match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

const GENERATION_CODE_RE = /\bC([1-8])\b/i

function estimateYear(name: string): number | null {
  const fourDigit = extractYearFromName(name)
  if (fourDigit) return fourDigit
  const twoDigit = name.match(/\b\d{2}\b/)
  if (twoDigit) {
    const n = Number(twoDigit[0])
    return n <= 30 ? 2000 + n : 1900 + n
  }
  return null
}

function generationYearRange(gen: Exclude<Generation, '—'>): [number, number] {
  const [start, end] = GENERATIONS[gen].years.split('–')
  return [Number(start), end === 'Now' ? Infinity : Number(end)]
}

function generationForYear(year: number): Generation | null {
  for (const gen of Object.keys(GENERATIONS) as Exclude<Generation, '—'>[]) {
    const [start, end] = generationYearRange(gen)
    if (year >= start && year <= end) return gen
  }
  return null
}

// A best-effort chronological lookup for browsing the diecast reference catalog, not a
// data-integrity concern like the Add form's prefill -- unlike extractYearFromName alone,
// this also resolves 2-digit years using a pivot (<=30 -> 20xx, else 19xx), which correctly
// covers every 2-digit year actually seen in the scraped names. An explicit generation code
// in the name (e.g. "C6", "C7") wins over a guessed year, since the pivot heuristic is a
// guess while the code is a direct claim. Worst case for a name with neither is it's grouped
// as unknown ('—'), not wrongly generationed.
export function deriveGeneration(name: string): { generation: Generation; year: number | null } {
  const codeMatch = name.match(GENERATION_CODE_RE)
  const year = estimateYear(name)
  if (codeMatch) return { generation: `C${codeMatch[1]}` as Generation, year }
  if (year != null) {
    const gen = generationForYear(year)
    if (gen) return { generation: gen, year }
  }
  return { generation: '—', year }
}

export function wishlistItemAsCard(w: { id: string; title: string; estimatedPrice: number; imgKey: string | null; sourceVariantId: string | null; createdAt: string }): Item {
  const { generation, year } = deriveGeneration(w.title)
  return {
    id: w.id, title: w.title, sub: '', category: 'DIECAST', generation, year: year ?? '',
    scale: '', maker: '', acquired: w.createdAt.slice(0, 10), pricePaid: 0, value: w.estimatedPrice,
    valueAsOf: '', valueSource: '', productionDate: '', rarity: null, condition: '', location: '',
    story: '', featured: false, colorName: '', colorHex: '', imgKey: w.imgKey, attributes: {},
    sourceVariantId: w.sourceVariantId,
  }
}

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export interface Stats { total: number; value: number; paid: number; gens: number; earliest: number; latest: number }

export const stats = (items: Item[]): Stats => {
  const total = items.length
  const value = items.reduce((s, i) => s + (Number(i.value) || 0), 0)
  const paid = items.reduce((s, i) => s + (Number(i.pricePaid) || 0), 0)
  const gens = new Set(items.map((i) => i.generation).filter((g) => g && g !== '—')).size
  const earliest = items.reduce((m, i) => Math.min(m, Number(i.year) || 9999), 9999)
  const latest = items.reduce((m, i) => Math.max(m, Number(i.year) || 0), 0)
  return { total, value, paid, gens, earliest, latest }
}

const DEFAULT_COLOR = { name: 'Unpainted', hex: '#B9AC97' }
export const colorOf = (item: Pick<Item, 'colorName'|'colorHex'> | null | undefined) =>
  item && item.colorHex ? { name: item.colorName, hex: item.colorHex } : DEFAULT_COLOR

function hexToRgb(hex: string): [number, number, number] {
  const m = (hex || '#000').replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex)
  const r0 = r / 255, g0 = g / 255, b0 = b / 255
  const max = Math.max(r0, g0, b0), min = Math.min(r0, g0, b0), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r0) h = ((g0 - b0) / d) % 6
    else if (max === g0) h = (b0 - r0) / d + 2
    else h = (r0 - g0) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  const light = (max + min) / 2
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1))
  return { h, s: sat, l: light }
}

export function colorKey(item: Pick<Item, 'colorName'|'colorHex'>): number {
  const { h, s, l } = hsl(colorOf(item).hex)
  return s < 0.18 ? 1000 - l * 100 : h
}

export const GEN_ORDER: Generation[] = ['C1','C2','C3','C4','C5','C6','C7','C8','—']
const genIndex = (item: Pick<Item,'generation'>) => {
  const i = GEN_ORDER.indexOf(item.generation)
  return i < 0 ? 99 : i
}

export function compareByGeneration(a: { generation: Generation; year: number | null; name: string }, b: { generation: Generation; year: number | null; name: string }): number {
  const genDiff = genIndex(a) - genIndex(b)
  if (genDiff !== 0) return genDiff
  const yearDiff = (a.year ?? Infinity) - (b.year ?? Infinity)
  if (!isNaN(yearDiff) && yearDiff !== 0) return yearDiff
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

type Comparator = (a: Item, b: Item) => number
export const ARRANGE: Record<'release'|'date'|'generation'|'color'|'category'|'value', Comparator> = {
  release: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0) || genIndex(a) - genIndex(b) || String(a.title).localeCompare(String(b.title)),
  date: (a, b) => String(a.acquired || '').localeCompare(String(b.acquired || '')),
  generation: (a, b) => genIndex(a) - genIndex(b) || (Number(a.year) || 0) - (Number(b.year) || 0),
  color: (a, b) => colorKey(a) - colorKey(b),
  category: (a, b) => String(a.category).localeCompare(String(b.category)) || (Number(a.year) || 0) - (Number(b.year) || 0),
  value: (a, b) => (b.value || 0) - (a.value || 0),
}
export const ARRANGE_LABELS: Record<keyof typeof ARRANGE, string> = {
  release: 'release year', date: 'date acquired', generation: 'generation', color: 'color', category: 'type', value: 'value',
}

export const CAR_CATEGORIES: Category[] = ['DIECAST', 'SPECIALTY CAR']
export const isCar = (item: Pick<Item,'category'> | null | undefined): boolean =>
  !!item && CAR_CATEGORIES.includes(item.category)

export type Collection = 'Diecast' | 'Specialty Cars' | 'Other' | 'Auto Parts' | 'Hubcaps'
export const COLLECTION_NAMES: Collection[] = ['Diecast', 'Specialty Cars', 'Other', 'Auto Parts', 'Hubcaps']

export const COLLECTIONS: Record<Collection, Category[]> = {
  'Diecast': ['DIECAST'],
  'Specialty Cars': ['SPECIALTY CAR'],
  'Other': [
    'BROCHURE', 'ADVERTISEMENT', 'BADGE', 'PATCH', 'PHOTO', 'BOOK', 'ART',
    'OTHER COLLECTABLES', 'INSTRUCTIONAL CD', 'MUSIC CD', 'LITHOGRAPHIC TIN', 'MAGAZINE', 'OWNERS MANUAL',
  ],
  'Auto Parts': ['AUTO PART'],
  'Hubcaps': ['HUBCAP'],
}

export function collectionOf(category: Category): Collection {
  for (const name of COLLECTION_NAMES) {
    if (COLLECTIONS[name].includes(category)) return name
  }
  return 'Other'
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  /** Only relevant when another field (identified by key) equals a given value — e.g. a "Custom" free-text field that only applies when its paired dropdown is set to "Other / Custom". */
  showWhen?: { key: string; equals: string }
}

export const CATEGORY_HAS_GENERATION: Record<Category, boolean> = {
  'DIECAST': true, 'BROCHURE': true, 'ADVERTISEMENT': true, 'BADGE': true, 'PATCH': true,
  'PHOTO': true, 'BOOK': true, 'ART': false, 'SPECIALTY CAR': true, 'OTHER COLLECTABLES': false,
  'INSTRUCTIONAL CD': true, 'MUSIC CD': true, 'LITHOGRAPHIC TIN': true, 'MAGAZINE': false,
  'AUTO PART': true, 'OWNERS MANUAL': false, 'HUBCAP': true,
}

export const CATEGORY_FIELDS: Record<Category, FieldDef[]> = {
  'DIECAST': [
    { key: 'castingYear', label: 'Casting Year', type: 'number', placeholder: '1975' },
    { key: 'modelSeries', label: 'Model Series', type: 'text' },
    { key: 'subSeries', label: 'Sub Series', type: 'text' },
    { key: 'toyNumber', label: 'Toy #', type: 'text' },
    { key: 'manufacturerCollectorNumber', label: 'Manufacturer Collector Number', type: 'text' },
    { key: 'primaryColor', label: 'Primary Color', type: 'text' },
    { key: 'tampoColor', label: 'Tampo Color', type: 'text' },
    { key: 'interiorColor', label: 'Interior Color', type: 'text' },
    { key: 'baseColorMat', label: 'Base Color / Mat', type: 'text' },
    { key: 'wheelType', label: 'Wheel Type', type: 'select', options: ['Redline', 'Real Riders', 'Basic Wheels', '5-Spoke', '5-Dot', 'Chrome', 'Other / Custom'] },
    { key: 'wheelTypeOther', label: 'Wheel Type (if Other / Custom)', type: 'text', showWhen: { key: 'wheelType', equals: 'Other / Custom' } },
    { key: 'looseOrCard', label: 'Loose / On-Card', type: 'select', options: ['Loose', 'On-Card'] },
    { key: 'bodyStyle', label: 'Coupe / Convertible / Roadster', type: 'select', options: ['Coupe', 'Convertible', 'Roadster'] },
    { key: 'driveType', label: 'Drive / Mechanism Type', type: 'select', options: ['Free-Roll', 'Pull Back', 'Pull Forward', 'Radio Controlled', 'IP Chip'] },
    { key: 'redline', label: 'Redline', type: 'checkbox' },
    { key: 'treasureHunt', label: 'Treasure Hunt', type: 'checkbox' },
    { key: 'softTire', label: 'Soft Tire', type: 'checkbox' },
    { key: 'starsAndStripes', label: 'Stars and Stripes Style', type: 'checkbox' },
    { key: 'goldPlated', label: 'Gold Plated', type: 'checkbox' },
    { key: 'silverPlated', label: 'Silver Plated', type: 'checkbox' },
    { key: 'iridescentMetallic', label: 'Iridescent / Metallic', type: 'checkbox' },
    { key: 'corvetteProStreet', label: 'Corvette Pro Street', type: 'checkbox' },
    { key: 'errorCar', label: 'Error Car', type: 'checkbox' },
    { key: 'blackMarketUnSpun', label: 'Black Market / Un-Spun', type: 'checkbox' },
  ],
  'BROCHURE': [],
  'ADVERTISEMENT': [
    { key: 'thirdPartyVendor', label: 'Third Party Vendor', type: 'checkbox' },
  ],
  'BADGE': [],
  'PATCH': [],
  'PHOTO': [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'colorMode', label: 'Black and White / Color', type: 'select', options: ['Black and White', 'Color'] },
    { key: 'material', label: 'Material', type: 'text' },
  ],
  'BOOK': [
    { key: 'editionDate', label: 'Edition Date', type: 'date' },
    { key: 'copyright', label: 'Copyright', type: 'text' },
    { key: 'binding', label: 'Hard / Paper', type: 'select', options: ['Hardcover', 'Paperback'] },
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'publishDate', label: 'Publish Date', type: 'date' },
    { key: 'subjectMatter', label: 'Subject Matter', type: 'text' },
    { key: 'multiGeneration', label: 'Multi-Generation', type: 'checkbox' },
    { key: 'dustCover', label: 'Dust Cover', type: 'checkbox' },
  ],
  'ART': [
    { key: 'presentation', label: 'Canvas / Frame / Unframed', type: 'select', options: ['Canvas', 'Framed', 'Unframed'] },
  ],
  'SPECIALTY CAR': [
    { key: 'material', label: 'Material (Pewter, Glass, etc.)', type: 'text' },
    { key: 'productionYear', label: 'Production Year', type: 'number' },
    { key: 'modelSeries', label: 'Model Series', type: 'text' },
    { key: 'subSeries', label: 'Sub Series', type: 'text' },
    { key: 'productionNumber', label: 'Production #', type: 'text' },
    { key: 'primaryColor', label: 'Primary Color', type: 'text' },
    { key: 'tampoColor', label: 'Tampo Color', type: 'text' },
    { key: 'interiorColor', label: 'Interior Color', type: 'text' },
    { key: 'baseColorMat', label: 'Base Color / Mat', type: 'text' },
    { key: 'bodyStyle', label: 'Coupe / Convertible / Roadster', type: 'select', options: ['Coupe', 'Convertible', 'Roadster'] },
    { key: 'driveType', label: 'Drive / Mechanism Type', type: 'select', options: ['Free-Roll', 'Pull Back', 'Pull Forward', 'Radio Controlled', 'IP Chip', 'Stationary'] },
  ],
  'OTHER COLLECTABLES': [
    { key: 'itemType', label: 'Type', type: 'text' },
  ],
  'INSTRUCTIONAL CD': [],
  'MUSIC CD': [
    { key: 'artist', label: 'Artist', type: 'text' },
    { key: 'album', label: 'Album', type: 'text' },
    { key: 'edition', label: 'Edition', type: 'text' },
  ],
  'LITHOGRAPHIC TIN': [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'shape', label: 'Shape', type: 'text' },
  ],
  'MAGAZINE': [
    { key: 'vendor', label: 'Vendor', type: 'text' },
    { key: 'volume', label: 'Volume', type: 'text' },
  ],
  'AUTO PART': [
    { key: 'partType', label: 'Part Type', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
  ],
  'OWNERS MANUAL': [
    { key: 'originalOwner', label: 'Original Owner', type: 'text' },
  ],
  'HUBCAP': [],
}

// --- Collection page filtering -------------------------------------------------
// Per-category attribute filters (one control per CATEGORY_FIELDS[category] entry)
// plus a handful of common top-level filters. All pure so they're unit-testable
// without any Nuxt runtime.

export interface NumberRangeFilter { min: string; max: string }
export interface DateRangeFilter { from: string; to: string }
export type AttributeFilterValue = string | NumberRangeFilter | DateRangeFilter

export function emptyAttributeFilterValue(type: FieldType): AttributeFilterValue {
  if (type === 'number') return { min: '', max: '' }
  if (type === 'date') return { from: '', to: '' }
  return '' // text, textarea, select, checkbox ('' | 'true' | 'false')
}

export function freshAttributeFilters(fields: FieldDef[]): Record<string, AttributeFilterValue> {
  const next: Record<string, AttributeFilterValue> = {}
  for (const f of fields) next[f.key] = emptyAttributeFilterValue(f.type)
  return next
}

export function matchesAttributeField(type: FieldType, value: unknown, filter: AttributeFilterValue): boolean {
  switch (type) {
    case 'select':
      return !filter || value === filter
    case 'checkbox':
      return !filter || String(!!value) === filter
    case 'number': {
      const { min, max } = filter as NumberRangeFilter
      const n = Number(value)
      if (min.trim() !== '' && !(n >= Number(min))) return false
      if (max.trim() !== '' && !(n <= Number(max))) return false
      return true
    }
    case 'date': {
      const { from, to } = filter as DateRangeFilter
      const v = String(value ?? '')
      if (from.trim() !== '' && !(v && v >= from)) return false
      if (to.trim() !== '' && !(v && v <= to)) return false
      return true
    }
    default: // text, textarea
      return !String(filter as string).trim() || String(value ?? '').toLowerCase().includes(String(filter).trim().toLowerCase())
  }
}

export function matchesAttributeFilters(item: Pick<Item, 'attributes'>, fields: FieldDef[], filters: Record<string, AttributeFilterValue>): boolean {
  return fields.every((f) => matchesAttributeField(f.type, item.attributes[f.key], filters[f.key] ?? emptyAttributeFilterValue(f.type)))
}

export interface TopLevelFilters {
  maker: string
  condition: string
  generation: Generation | ''
  rarityMin: number | null
  valueMin: string
  valueMax: string
  acquiredFrom: string
  acquiredTo: string
}

export const emptyTopLevelFilters = (): TopLevelFilters => ({
  maker: '', condition: '', generation: '', rarityMin: null, valueMin: '', valueMax: '', acquiredFrom: '', acquiredTo: '',
})

export function matchesTopLevelFilters(item: Item, filters: TopLevelFilters): boolean {
  if (filters.maker.trim() && !item.maker.toLowerCase().includes(filters.maker.trim().toLowerCase())) return false
  if (filters.condition.trim() && !item.condition.toLowerCase().includes(filters.condition.trim().toLowerCase())) return false
  if (filters.generation && item.generation !== filters.generation) return false
  if (filters.rarityMin != null && (item.rarity ?? 0) < filters.rarityMin) return false
  if (filters.valueMin.trim() && item.value < Number(filters.valueMin)) return false
  if (filters.valueMax.trim() && item.value > Number(filters.valueMax)) return false
  if (filters.acquiredFrom.trim() && !(item.acquired && item.acquired >= filters.acquiredFrom)) return false
  if (filters.acquiredTo.trim() && !(item.acquired && item.acquired <= filters.acquiredTo)) return false
  return true
}

export interface GradeLevel { value: string; name: string; description: string }
export const DIECAST_GRADE_SCALE: GradeLevel[] = [
  { value: '10', name: 'Gem Mint', description: 'Car is virtually free of any physical defects, slightest tarnished base or engine is a possible allowance. Chrome on wheels is perfect.' },
  { value: '9.5', name: 'Mint', description: 'Appears to exhibit all attributes of Gem Mint. Upon close inspection may exhibit extreme minor imperfections. Any flaw is barely noticeable, pin chip, extreme slight tone or paint variation. Chrome on wheels nearly perfect.' },
  { value: '9.0', name: 'NM/Mint', description: 'The car appears mint at first glance. Upon close inspection shows slight imperfections, very minor limited chips. Slightly crooked tampos, a near perfect item. Slight chrome loss on wheels.' },
  { value: '8.5', name: 'NM', description: 'Slight wear is visible on close inspection. Decals, small light scratches, light toning, wheels show light wear, toning, tires slight bend, etc.' },
  { value: '8.0', name: 'EX/MT', description: 'Car has visible surface wear or small defects which do not affect overall appeal. Toning can be noticeable. This grade still a nice higher end rating.' },
  { value: '7.0', name: 'EX', description: 'Surface wear or defects more visible. Played with but not abused. Very noticeable toning, worn wheels, chipping, etc.' },
  { value: '6.0', name: 'VG/EX', description: 'Exhibits some of the better characteristics of EX, but not enough to earn the grade.' },
  { value: '5.0', name: 'VG', description: 'Defects evident. More than light chipping. Noticeable scratches and scuffs. Middle of the road grade.' },
  { value: '4.0', name: 'GD/VG', description: 'Heavy chipping, major defects, cracked tires or windows. Some deem filler grade.' },
  { value: '3.0', name: 'GD', description: 'Extreme wear, at least 1/2 the paint still exists. Abused condition.' },
  { value: '2.0', name: 'Fair', description: 'Extreme wear, scuffing, scratches, pitting. Little to no paint, a bit above poor.' },
  { value: '1.0', name: 'Poor', description: 'Extreme wear, scuffing scratches, pitting, missing parts, basically car exists.' },
]
export const DIECAST_GRADE_SCALE_ATTRIBUTION = 'This grade scale was compiled by collectors from RLOL, combines a 10 point system along with a simple system of describing a car as either mint (10) or poor (1).'
export const gradeLabel = (g: GradeLevel): string => `${g.value} - ${g.name}`
