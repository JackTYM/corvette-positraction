<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Crop Photo</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px; align-items: center;">
        <div
          ref="frameEl"
          class="crop-frame"
          :style="{ aspectRatio: String(aspectRatio) }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <img
            ref="imgEl"
            :src="src"
            class="crop-frame-img"
            :class="{ 'is-ready': ready }"
            :style="imgStyle"
            draggable="false"
            crossorigin="anonymous"
            @dragstart.prevent
            @load="onImgLoad"
            @error="onImgError"
          />
          <div v-if="!ready" class="crop-frame-loading">{{ error ? "Couldn't load that photo." : 'Loading…' }}</div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; width: 100%; max-width: 420px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px;">Zoom</span>
          <input v-model.number="zoom" type="range" min="1" :max="maxZoom" step="0.01" style="flex: 1;" :disabled="!ready" @input="onZoomInput" />
        </div>

        <p style="font-style: italic; color: var(--muted); font-size: 12.5px; margin: 0; text-align: center;">Drag the photo to reposition · scroll or use the slider to zoom</p>

        <div style="display: flex; justify-content: flex-end; gap: 10px; width: 100%;">
          <button class="btn ghost" type="button" @click="$emit('close')">Cancel</button>
          <button class="btn primary" type="button" :disabled="!ready" :style="{ opacity: ready ? 1 : 0.45, pointerEvents: ready ? 'auto' : 'none' }" @click="confirm">Use This Crop</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ src: string; aspectRatio?: number }>(), {
  // Matches the source photos on smalldiecastcorvettes.com (consistently 201x104), which
  // is where the vast majority of photos run through this crop tool originate.
  aspectRatio: 201 / 104,
})
const emit = defineEmits<{ close: []; confirm: [blob: Blob] }>()

const frameEl = ref<HTMLDivElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const ready = ref(false)
const error = ref(false)

const frameSize = reactive({ w: 360, h: 360 / props.aspectRatio })
const naturalSize = reactive({ w: 0, h: 0 })
const baseScale = ref(1)
const zoom = ref(1)
const maxZoom = 4
const pan = reactive({ x: 0, y: 0 })

function measureFrame() {
  const el = frameEl.value
  if (!el) return
  frameSize.w = el.clientWidth
  frameSize.h = el.clientHeight
}

function clampPan() {
  const scale = baseScale.value * zoom.value
  const dispW = naturalSize.w * scale
  const dispH = naturalSize.h * scale
  const minX = Math.min(0, frameSize.w - dispW)
  const minY = Math.min(0, frameSize.h - dispH)
  pan.x = Math.min(0, Math.max(minX, pan.x))
  pan.y = Math.min(0, Math.max(minY, pan.y))
}

// Zooms while keeping the image point currently under (anchorX, anchorY) -- in frame-local
// CSS px -- fixed in place, so zooming via the slider (anchored at frame center) or the
// scroll wheel (anchored at the cursor) both feel stable instead of re-centering the crop.
function zoomTo(newZoom: number, anchorX: number, anchorY: number) {
  const clamped = Math.min(maxZoom, Math.max(1, newZoom))
  const oldScale = baseScale.value * zoom.value
  const newScale = baseScale.value * clamped
  const ix = (anchorX - pan.x) / oldScale
  const iy = (anchorY - pan.y) / oldScale
  pan.x = anchorX - ix * newScale
  pan.y = anchorY - iy * newScale
  zoom.value = clamped
  clampPan()
}

function onZoomInput() {
  zoomTo(zoom.value, frameSize.w / 2, frameSize.h / 2)
}

function onWheel(e: WheelEvent) {
  if (!ready.value) return
  const rect = frameEl.value?.getBoundingClientRect()
  const ax = rect ? e.clientX - rect.left : frameSize.w / 2
  const ay = rect ? e.clientY - rect.top : frameSize.h / 2
  zoomTo(zoom.value - zoom.value * (e.deltaY * 0.0018), ax, ay)
}

let dragging = false
let dragStart = { x: 0, y: 0, panX: 0, panY: 0 }
function onPointerDown(e: PointerEvent) {
  if (!ready.value) return
  dragging = true
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  dragStart = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
}
function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  pan.x = dragStart.panX + (e.clientX - dragStart.x)
  pan.y = dragStart.panY + (e.clientY - dragStart.y)
  clampPan()
}
function onPointerUp() {
  dragging = false
}

const imgStyle = computed(() => {
  const scale = baseScale.value * zoom.value
  return {
    width: `${naturalSize.w}px`,
    height: `${naturalSize.h}px`,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  }
})

function recalcForFrame() {
  measureFrame()
  if (!naturalSize.w || !naturalSize.h) return
  baseScale.value = Math.max(frameSize.w / naturalSize.w, frameSize.h / naturalSize.h)
  zoom.value = 1
  pan.x = (frameSize.w - naturalSize.w * baseScale.value) / 2
  pan.y = (frameSize.h - naturalSize.h * baseScale.value) / 2
  clampPan()
}

function onImgLoad() {
  const img = imgEl.value
  if (!img) return
  naturalSize.w = img.naturalWidth
  naturalSize.h = img.naturalHeight
  recalcForFrame()
  error.value = false
  ready.value = true
}
function onImgError() {
  error.value = true
  ready.value = false
}

onMounted(() => window.addEventListener('resize', recalcForFrame))
onBeforeUnmount(() => window.removeEventListener('resize', recalcForFrame))

async function confirm() {
  const img = imgEl.value
  if (!img || !ready.value) return
  const scale = baseScale.value * zoom.value
  const sx = -pan.x / scale
  const sy = -pan.y / scale
  const sw = frameSize.w / scale
  const sh = frameSize.h / scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw))
  canvas.height = Math.max(1, Math.round(sh))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  try {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    emit('confirm', blob)
  } catch (err) {
    console.warn('Failed to render crop:', err)
    error.value = true
  }
}
</script>

<style scoped>
.crop-frame {
  position: relative;
  width: min(420px, 78vw);
  overflow: hidden;
  border: 2px solid var(--ink);
  background: #17120d;
  touch-action: none;
  cursor: grab;
}
.crop-frame:active { cursor: grabbing; }
.crop-frame-img {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
  user-select: none;
  -webkit-user-drag: none;
}
.crop-frame-img.is-ready { visibility: visible; }
.crop-frame-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-cond);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 11px;
  color: rgba(245, 240, 232, 0.6);
  pointer-events: none;
}
</style>
