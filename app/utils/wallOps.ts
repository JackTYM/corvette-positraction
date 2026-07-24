// app/utils/wallOps.ts — pure reordering logic for the garage wall, ported from garage.jsx for testability
import type { Item } from './catalog'

export function caseOffsets(caps: number[]): number[] {
  const offsets: number[] = []
  caps.reduce((acc, cap, i) => { offsets[i] = acc; return acc + cap }, 0)
  return offsets
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
  const item = byId[itemId]!
  const rest = order.filter((id) => id !== itemId)
  let idx = 0
  for (const id of rest) {
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
  const sortedMid = [...mid].sort((a, b) => compare(byId[a]!, byId[b]!))
  return [...before, ...sortedMid, ...after]
}
