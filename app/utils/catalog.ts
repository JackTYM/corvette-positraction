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

export type Category = 'DIECAST'|'HOT WHEELS'|'BROCHURE'|'SIGN'|'BADGE'|'PRESS PHOTO'

export const CATEGORIES: Record<Category, 'orange'|'ink'> = {
  'DIECAST': 'orange',
  'HOT WHEELS': 'ink',
  'BROCHURE': 'ink',
  'SIGN': 'orange',
  'BADGE': 'ink',
  'PRESS PHOTO': 'orange',
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
  condition: string
  location: string
  story: string
  featured: boolean
  colorName: string
  colorHex: string
  imgKey: string | null
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

export const CAR_CATEGORIES: Category[] = ['DIECAST', 'HOT WHEELS']
export const isCar = (item: Pick<Item,'category'> | null | undefined): boolean =>
  !!item && CAR_CATEGORIES.includes(item.category)

export interface FieldSpec { l: string; ph: string }
export interface FieldSet { gen: boolean; year: FieldSpec; scale: FieldSpec; maker: FieldSpec }
export const FIELD_SETS: Record<Category, FieldSet> = {
  'DIECAST':     { gen: true,  year: { l: 'Year', ph: '1963' },  scale: { l: 'Scale', ph: '1:18' },       maker: { l: 'Brand / Marque', ph: 'AUTOart' } },
  'HOT WHEELS':  { gen: true,  year: { l: 'Year', ph: '1990' },  scale: { l: 'Scale', ph: '1:64' },       maker: { l: 'Series', ph: 'First Editions' } },
  'BROCHURE':    { gen: true,  year: { l: 'Year', ph: '1967' },  scale: { l: 'Format', ph: 'Fold-out' },   maker: { l: 'Publisher', ph: 'Chevrolet Division' } },
  'SIGN':        { gen: false, year: { l: 'Year', ph: '1965' },  scale: { l: 'Dimensions', ph: '24"' },    maker: { l: 'Material', ph: 'Porcelain enamel' } },
  'BADGE':       { gen: false, year: { l: 'Year', ph: '1985' },  scale: { l: 'Dimensions', ph: '2"' },     maker: { l: 'Material', ph: 'Enamel on brass' } },
  'PRESS PHOTO': { gen: true,  year: { l: 'Year', ph: '2014' },  scale: { l: 'Format', ph: '8×10 glossy' }, maker: { l: 'Source', ph: 'GM Media' } },
}
