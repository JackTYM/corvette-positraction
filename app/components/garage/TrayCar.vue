<template>
  <div class="tray-car" draggable="true" @dragstart="onDragStart" @dragend="$emit('dragend')">
    <div class="tray-car-spine" :style="{ background: colorOf(item).hex }" />
    <div style="cursor: pointer; padding: 6px 9px; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2px;" @click="$emit('open', item)">
      <div style="font-family: var(--font-display); font-weight: 800; font-size: 12px; line-height: 1.02; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">{{ item.title }}</div>
      <div style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.07em; font-size: 9px; color: var(--muted); display: flex; gap: 6px;">
        <span>{{ item.generation === '—' ? 'EPH' : item.generation }}</span><span>·</span><span>{{ item.year || '—' }}</span>
      </div>
    </div>
    <button class="tray-file no-print" title="Drop it into its release-year slot" @click="$emit('file')">file by<br />year →</button>
  </div>
</template>

<script setup lang="ts">
import { colorOf, type Item } from '~/utils/catalog'
const props = defineProps<{ item: Item }>()
const emit = defineEmits<{ open: [item: Item]; file: []; dragstart: [e: DragEvent]; dragend: [] }>()

function onDragStart(e: DragEvent) {
  try {
    e.dataTransfer?.setData('text/plain', props.item.id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  } catch { /* Safari/older browsers can throw on unsupported setData calls — dragging still works */ }
  emit('dragstart', e)
}
</script>
