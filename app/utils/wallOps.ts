// app/utils/wallOps.ts — pure reordering logic for the garage/showroom walls, ported from garage.jsx for testability

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
