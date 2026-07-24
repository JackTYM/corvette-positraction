<template>
  <div class="case">
    <div class="case-head">
      <div style="min-width: 180px;">
        <div class="kicker" style="color: var(--muted); font-size: 10px; margin-bottom: 3px;">Case No. {{ index + 1 }}</div>
        <h3 style="font-size: 26px; line-height: 0.95;">{{ c.name }}</h3>
      </div>
      <div class="case-specs">
        <div><span class="case-k">Frame</span><span class="case-v">{{ c.cols }} × {{ c.rows }}</span></div>
        <div><span class="case-k">Filled</span><span class="case-v">{{ filled }} / {{ cap }}</span></div>
        <div><span class="case-k">On Display</span><span class="case-v" style="color: var(--orange);">{{ fmtMoney(parkedValue) }}</span></div>
      </div>
      <div class="case-actions no-print">
        <div v-if="fit < 0.999" style="display: flex; align-items: center; gap: 4px; margin-right: 2px;">
          <button class="icon-btn" title="Zoom out" @click="stepZoom(-0.15)">−</button>
          <button class="icon-btn" title="Fit whole case" :style="zoom == null ? { borderColor: 'var(--ink)', color: 'var(--ink)', background: 'var(--paper-2)' } : {}" @click="zoom = null">
            {{ zoom == null ? 'Fit' : Math.round(scale * 100) + '%' }}
          </button>
          <button class="icon-btn" title="Zoom in" @click="stepZoom(0.15)">+</button>
        </div>
        <div style="position: relative;">
          <button class="icon-btn" @click="sortOpen = !sortOpen">tidy this case ▾</button>
          <div v-if="sortOpen" class="sort-menu" @mouseleave="sortOpen = false">
            <div class="kicker" style="font-size: 9px; color: var(--muted); padding: 8px 12px 4px;">Sort just this case by</div>
            <button v-for="k in arrangeKeys" :key="k" class="sort-menu-row" @click="onArrange(k)">{{ ARRANGE_LABELS[k] }}</button>
          </div>
        </div>
        <button class="icon-btn" @click="$emit('edit', index)">resize</button>
        <button class="icon-btn" @click="$emit('empty', index)">empty</button>
        <button v-if="canRemove" class="icon-btn danger" @click="$emit('remove', index)">remove</button>
      </div>
    </div>
    <div class="case-frame" ref="frameRef" :style="{ overflowX: zoom != null && scale > fit + 0.001 ? 'auto' : 'hidden' }">
      <div :style="{ width: natW ? natW * scale + 'px' : undefined, height: natH ? natH * scale + 'px' : undefined, overflow: 'hidden' }">
        <div class="case-mat" ref="matRef" :style="{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'inline-block' }">
          <div class="case-grid" :style="{ gridTemplateColumns: `repeat(${c.cols}, 150px)` }">
            <div
              v-for="i in cap" :key="i" class="slot"
              :class="{ empty: !slotItem(i - 1), dropinto: over === offset + i - 1, bumped: !!slotItem(i - 1) && bumped.has(slotItem(i - 1)!.id) }"
              @dragover.prevent="onDragOver(offset + i - 1)" @dragleave="onDragLeave(offset + i - 1)"
              @drop.prevent="onDrop(offset + i - 1)" @click="!slotItem(i - 1) && $emit('emptySlot', offset + i - 1)"
            >
              <span class="slot-num">{{ String(i).padStart(2, '0') }}</span>
              <SlotCar
                v-if="slotItem(i - 1)" :item="slotItem(i - 1)!" :dragging="dragId === slotItem(i - 1)!.id"
                @open="$emit('open', $event)" @eject="$emit('eject', slotItem(i - 1)!.id)"
                @dragstart="$emit('dragstart', slotItem(i - 1)!.id)" @dragend="$emit('dragend')"
              />
              <span v-else class="slot-plus no-print">+ shelve a car</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, ARRANGE_LABELS, type Item } from '~/utils/catalog'
import type { WallCase } from '~/composables/useWall'

const props = defineProps<{
  c: WallCase; index: number; order: string[]; byId: Record<string, Item>; offset: number; cap: number;
  bumped: Set<string>; dragId: string | null; canRemove: boolean;
}>()
const emit = defineEmits<{
  dropSeq: [itemId: string, seq: number]; eject: [id: string]; open: [item: Item]; emptySlot: [seq: number];
  dragstart: [id: string]; dragend: []; arrangeCase: [index: number, key: keyof typeof ARRANGE_LABELS];
  edit: [index: number]; empty: [index: number]; remove: [index: number];
}>()

function slotItem(i: number): Item | null {
  const id = props.order[props.offset + i]
  return id ? props.byId[id] ?? null : null
}
const filled = computed(() => Math.max(0, Math.min(props.order.length - props.offset, props.cap)))
const parkedValue = computed(() =>
  props.order.slice(props.offset, props.offset + props.cap).reduce((s, id) => s + (props.byId[id]?.value ?? 0), 0),
)

const sortOpen = ref(false)
const arrangeKeys = Object.keys(ARRANGE_LABELS) as (keyof typeof ARRANGE_LABELS)[]
function onArrange(k: keyof typeof ARRANGE_LABELS) { emit('arrangeCase', props.index, k); sortOpen.value = false }

const zoom = ref<number | null>(null)
const fit = ref(1)
const natH = ref(0)
const natW = ref(0)
const frameRef = ref<HTMLElement | null>(null)
const matRef = ref<HTMLElement | null>(null)
const scale = computed(() => (zoom.value == null ? fit.value : zoom.value))
function stepZoom(d: number) { zoom.value = Math.max(0.2, Math.min(1, (zoom.value ?? fit.value) + d)) }

let ro: ResizeObserver | null = null
function measure() {
  if (!frameRef.value || !matRef.value) return
  const avail = frameRef.value.clientWidth - 24
  const w = matRef.value.scrollWidth || 1
  fit.value = Math.min(2, avail / w)
  natH.value = matRef.value.offsetHeight
  natW.value = w
}
onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (frameRef.value) ro.observe(frameRef.value)
})
onUnmounted(() => ro?.disconnect())
watch(() => [props.c.cols, props.c.rows, props.cap, props.order.length], () => nextTick(measure))

const over = ref<number | null>(null)
function onDragOver(seq: number) { if (props.dragId) over.value = seq }
function onDragLeave(seq: number) { if (over.value === seq) over.value = null }
function onDrop(seq: number) {
  over.value = null
  if (props.dragId) emit('dropSeq', props.dragId, seq)
}
</script>
