// app/utils/wallOps.ts — pure reordering logic for the garage wall, ported from garage.jsx for testability
import type { Item } from './catalog'

export function caseOffsets(caps: number[]): number[] {
  const offsets: number[] = []
  caps.reduce((acc, cap, i) => { offsets[i] = acc; return acc + cap }, 0)
  return offsets
}

// Excel-style base-26 letter labeling for case index (0-based): A, B, ..., Z, AA, AB, ...
export function caseLetter(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

// A physical-location code for a slot: case letter, 1-based row, 1-based column within the
// row (e.g. "A-1-5"), matching how the client marks case walls by hand.
export function slotCode(caseIndex: number, slotIndex: number, cols: number): string {
  const row = Math.floor(slotIndex / cols) + 1
  const space = (slotIndex % cols) + 1
  return `${caseLetter(caseIndex)}-${row}-${space}`
}

export function moveInOrder(order: string[], itemId: string, targetSeq: number): string[] {
  const without = order.filter((id) => id !== itemId)
  const idx = Math.max(0, Math.min(targetSeq, without.length))
  const next = [...without]
  next.splice(idx, 0, itemId)
  return next
}

export function fileByComparator(
  order: string[], byId: Record<string, Item>, itemId: string, compare: (a: Item, b: Item) => number,
): string[] {
  // Safe: callers (garage.vue) must filter `order` against `byId` before calling —
  // dangling ids here would indicate a caller bug, not a data condition to handle silently.
  const item = byId[itemId]!
  const rest = order.filter((id) => id !== itemId)
  let idx = 0
  for (const id of rest) {
    // Safe: callers (garage.vue) must filter `order` against `byId` before calling —
    // dangling ids here would indicate a caller bug, not a data condition to handle silently.
    if (compare(byId[id]!, item) <= 0) idx++
    else break
  }
  return moveInOrder(order, itemId, idx)
}

export function arrangeSlice(
  order: string[], byId: Record<string, Item>, start: number, cap: number, compare: (a: Item, b: Item) => number,
): string[] {
  const before = order.slice(0, start)
  const mid = order.slice(start, start + cap)
  const after = order.slice(start + cap)
  // Safe: callers (garage.vue) must filter `order` against `byId` before calling —
  // dangling ids here would indicate a caller bug, not a data condition to handle silently.
  const sortedMid = [...mid].sort((a, b) => compare(byId[a]!, byId[b]!))
  return [...before, ...sortedMid, ...after]
}
