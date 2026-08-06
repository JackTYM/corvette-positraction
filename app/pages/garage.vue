<template>
  <div class="wrap" style="padding: 34px 26px 80px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Two</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 8px;">The Garage</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 6px; max-width: 620px;">
      A working plan of the display cases on the wall. Build each case to the size of the real frame, then arrange the cars by hand — or let the whole wall re-file itself in one move.
    </p>
    <p class="no-print" style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em; font-size: 11.5px; color: var(--muted); margin: 0 0 22px;">
      Drag a car into any slot — everything after it slides down one, just like the shelf.
    </p>

    <div class="no-print garage-toolbar">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 2px;">Re-file the whole wall by</span>
      <button v-for="k in arrangeKeys" :key="k" class="link-tab whole-wall-tab" :class="{ suggested: k === 'release' }" @click="arrangeWall(k)">{{ ARRANGE_LABELS[k] }}</button>
      <div style="flex: 1;" />
      <button class="btn ghost" style="padding: 7px 13px; font-size: 12px;" @click="formState = { add: true }">+ Add Case</button>
      <button v-if="order.length > 0" class="link-tab" style="font-size: 12px; padding: 6px 11px; border: 1.5px solid var(--rule); color: var(--muted);" @click="confirmEmptyWall">clear wall</button>
    </div>

    <div v-if="overflow.length > 0" class="wall-warn no-print">
      <span>▲ {{ overflow.length }} car{{ overflow.length > 1 ? 's' : '' }} won't fit — add a case or make one bigger.</span>
      <button class="icon-btn" style="border-color: var(--orange-deep); color: var(--orange-deep);" @click="formState = { add: true }">+ build a case</button>
    </div>

    <div v-if="cases.length === 0" class="collection-empty">
      <p style="font-style: italic; color: var(--muted); font-size: 17px; margin-bottom: 16px;">No cases on the wall yet.</p>
      <button class="btn primary" @click="formState = { add: true }">+ Build Your First Case</button>
    </div>

    <DisplayCase
      v-for="(c, i) in cases" :key="c.id" :c="c" :index="i" :order="order" :by-id="byId"
      :offset="offsets[i]" :cap="caps[i]" :bumped="bumped" :drag-id="dragId" :can-remove="cases.length > 1"
      @open="openItem" @eject="eject" @empty-slot="(seq) => (pickSeq = seq)"
      @arrange-case="arrangeCase" @edit="(idx) => (formState = { editIndex: idx })"
      @empty="emptyCase" @remove="removeCase" @drop-seq="moveTo"
      @dragstart="(id) => (dragId = id)" @dragend="() => (dragId = null)"
    />

    <div v-if="loose.length > 0" class="tray" style="margin-top: 8px;" @dragover.prevent @drop.prevent="onTrayDrop">
      <div class="tray-head">
        <div>
          <div class="kicker" style="color: var(--muted); font-size: 10px;">Not on the wall</div>
          <div style="font-family: var(--font-display); font-weight: 800; font-size: 20px;">{{ loose.length }} car{{ loose.length > 1 ? 's' : '' }} waiting</div>
        </div>
        <button class="btn ghost no-print" style="font-size: 12px; padding: 8px 13px;" @click="fileAllByYear">file all by year →</button>
      </div>
      <div class="tray-grid">
        <TrayCar v-for="it in loose" :key="it.id" :item="it" @open="openItem" @file="fileByYear(it.id)" @dragstart="() => (dragId = it.id)" @dragend="() => (dragId = null)" />
      </div>
    </div>

    <CaseForm v-if="formState?.add" @save="addCase" @cancel="formState = null" />
    <CaseForm v-else-if="formState?.editIndex != null" :initial="cases[formState.editIndex]" @save="(v) => editCase(formState!.editIndex!, v)" @cancel="formState = null" />
    <SlotPicker v-if="pickSeq != null" :candidates="loose" @close="pickSeq = null" @pick="(id) => { moveTo(id, pickSeq!); pickSeq = null }" />
  </div>
</template>

<script setup lang="ts">
import { ARRANGE, ARRANGE_LABELS, isCar, wishlistItemAsCard, type WallCard } from '~/utils/catalog'
import { caseOffsets, moveInOrder, fileByComparator, arrangeSlice } from '~/utils/wallOps'
import type { WallCase } from '~/composables/useWall'

const { items, fetchAll } = useItems()
const { items: wishlistItems, fetchAll: fetchWishlistAll } = useWishlist()
const { wall, fetchWall, saveWall } = useWall()
try {
  if (!items.value.length) await fetchAll()
  if (!wishlistItems.value.length) await fetchWishlistAll()
  await fetchWall()
} catch (err) {
  console.warn('Failed to load items/wall for the Garage page:', err)
}

const cases = computed(() => wall.value.cases)
const carItems = computed<WallCard[]>(() => [
  ...items.value.filter(isCar).map((i) => ({ ...i, owned: true })),
  ...wishlistItems.value.map((w) => ({ ...wishlistItemAsCard(w), owned: false })),
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
async function fileByYear(itemId: string) {
  await setOrder(fileByComparator(order.value, byId.value, itemId, ARRANGE.release))
}
async function fileAllByYear() {
  for (const it of loose.value) await fileByYear(it.id)
}
async function arrangeWall(key: keyof typeof ARRANGE_LABELS) {
  const sorted = [...carItems.value].sort(ARRANGE[key]).map((i) => i.id)
  await setOrder(sorted)
  bump(sorted)
}
async function arrangeCase(ci: number, key: keyof typeof ARRANGE_LABELS) {
  const next = arrangeSlice(order.value, byId.value, offsets.value[ci], caps.value[ci], ARRANGE[key])
  await setOrder(next)
  bump(next.slice(offsets.value[ci], offsets.value[ci] + caps.value[ci]))
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
const arrangeKeys = Object.keys(ARRANGE_LABELS) as (keyof typeof ARRANGE_LABELS)[]

function openItem(item: WallCard) { navigateTo(item.owned ? `/collection/${item.id}` : `/wishlist/${item.id}`) }
</script>
