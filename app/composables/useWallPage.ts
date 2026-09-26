import { wishlistItemAsCard, type Category, type WallCard } from '~/utils/catalog'
import { caseOffsets, moveInOrder } from '~/utils/wallOps'
import type { WallCase, WallKind } from '~/composables/useWall'

export async function useWallPage(kind: WallKind, categories: Category[]) {
  const { items, fetchAll } = useItems()
  const { items: wishlistItems, fetchAll: fetchWishlistAll } = useWishlist()
  const { wall, fetchWall, saveWall } = useWall(kind)
  try {
    if (!items.value.length) await fetchAll()
    if (!wishlistItems.value.length) await fetchWishlistAll()
    await fetchWall()
  } catch (err) {
    console.warn(`Failed to load items/wall for the ${kind} page:`, err)
  }

  const cases = computed(() => wall.value.cases)
  const carItems = computed<WallCard[]>(() => [
    ...items.value.filter((i) => categories.includes(i.category)).map((i) => ({ ...i, owned: true })),
    ...wishlistItems.value.filter((w) => categories.includes(w.category)).map((w) => ({ ...wishlistItemAsCard(w), owned: false })),
  ])
  const byId = computed(() => Object.fromEntries(carItems.value.map((i) => [i.id, i])))
  const order = computed(() => wall.value.order.filter((id) => byId.value[id]))

  const caps = computed(() => cases.value.map((c) => c.cols * c.rows))
  const offsets = computed(() => caseOffsets(caps.value))
  const totalCap = computed(() => caps.value.reduce((a, b) => a + b, 0))

  const placed = computed(() => new Set(order.value))
  const unplaced = computed(() => carItems.value.filter((i) => !placed.value.has(i.id)))
  const overflow = computed(() => order.value.slice(totalCap.value).map((id) => byId.value[id]))
  const loose = computed<WallCard[]>(() => [...overflow.value, ...unplaced.value])

  const dragId = ref<string | null>(null)
  const bumped = ref<Set<string>>(new Set())
  let bumpTimer: ReturnType<typeof setTimeout> | null = null
  function bump(ids: string[]) {
    bumped.value = new Set(ids)
    if (bumpTimer) clearTimeout(bumpTimer)
    bumpTimer = setTimeout(() => { bumped.value = new Set() }, 1400)
  }

  async function setOrder(next: string[]) {
    await saveWall({ cases: cases.value, order: next })
  }
  async function setCases(next: WallCase[]) {
    await saveWall({ cases: next, order: wall.value.order })
  }

  async function moveTo(itemId: string, targetSeq: number) {
    const next = moveInOrder(order.value, itemId, targetSeq)
    await setOrder(next)
    const idx = next.indexOf(itemId)
    bump(next.slice(idx))
    dragId.value = null
  }
  async function eject(itemId: string) {
    await setOrder(order.value.filter((id) => id !== itemId))
  }
  async function emptyCase(ci: number) {
    const start = offsets.value[ci], cap = caps.value[ci]
    await setOrder([...order.value.slice(0, start), ...order.value.slice(start + cap)])
  }
  function confirmEmptyWall() {
    if (window.confirm('Clear every case? Cars stay in your collection.')) setOrder([])
  }
  function onTrayDrop() {
    if (dragId.value) eject(dragId.value)
  }

  const formState = ref<{ add?: true; editIndex?: number } | null>(null)
  async function addCase(v: { name: string; cols: number; rows: number }) {
    await setCases([...cases.value, { id: 'c' + crypto.randomUUID().slice(0, 8), ...v }])
    formState.value = null
  }
  async function editCase(ci: number, v: { name: string; cols: number; rows: number }) {
    await setCases(cases.value.map((c, i) => (i === ci ? { ...c, ...v } : c)))
    formState.value = null
  }
  async function removeCase(ci: number) {
    if (!window.confirm('Take this case off the wall? The cars stay in your collection and shift into the remaining cases.')) return
    await setCases(cases.value.filter((_, i) => i !== ci))
  }

  const pickSeq = ref<number | null>(null)

  function openItem(item: WallCard) {
    navigateTo(item.owned ? `/collection/${item.id}` : `/wishlist/${item.id}`)
  }

  return {
    cases, order, byId, offsets, caps, overflow, loose,
    dragId, bumped, formState, pickSeq,
    moveTo, eject, emptyCase, confirmEmptyWall, onTrayDrop,
    addCase, editCase, removeCase, openItem,
  }
}
