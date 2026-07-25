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
  | 'MAGAZINE' | 'AUTO PART' | 'OWNERS MANUAL'

export const CATEGORIES: Record<Category, 'orange'|'ink'> = {
  'DIECAST': 'orange', 'BROCHURE': 'ink', 'ADVERTISEMENT': 'orange', 'BADGE': 'ink',
  'PATCH': 'orange', 'PHOTO': 'ink', 'BOOK': 'orange', 'ART': 'ink',
  'SPECIALTY CAR': 'orange', 'OTHER COLLECTABLES': 'ink', 'INSTRUCTIONAL CD': 'orange',
  'MUSIC CD': 'ink', 'LITHOGRAPHIC TIN': 'orange', 'MAGAZINE': 'ink', 'AUTO PART': 'orange',
  'OWNERS MANUAL': 'ink',
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
}

export const fmtMoney = (n: number | null | undefined): string =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

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

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
export interface FieldDef { key: string; label: string; type: FieldType; options?: string[]; placeholder?: string }

export const CATEGORY_HAS_GENERATION: Record<Category, boolean> = {
  'DIECAST': true, 'BROCHURE': true, 'ADVERTISEMENT': true, 'BADGE': true, 'PATCH': true,
  'PHOTO': true, 'BOOK': true, 'ART': false, 'SPECIALTY CAR': true, 'OTHER COLLECTABLES': false,
  'INSTRUCTIONAL CD': true, 'MUSIC CD': true, 'LITHOGRAPHIC TIN': true, 'MAGAZINE': false,
  'AUTO PART': true, 'OWNERS MANUAL': false,
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
    { key: 'wheelTypeOther', label: 'Wheel Type (if Other / Custom)', type: 'text' },
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
}
