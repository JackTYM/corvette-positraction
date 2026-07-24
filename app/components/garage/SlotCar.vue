<template>
  <div
    class="slot-car" :class="{ dragging }" draggable="true"
    :title="`${item.title} — drag to re-file`"
    @dragstart="onDragStart" @dragend="$emit('dragend')" @click="$emit('open', item)"
  >
    <img v-if="item.imgKey" class="slot-photo" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" draggable="false" />
    <div v-else class="slot-photo" style="background: var(--paper-2);" />
    <div class="slot-spine" :style="{ background: colorOf(item).hex }" />
    <div class="slot-veil">
      <div class="slot-body">
        <div class="slot-title">{{ item.title }}</div>
        <div class="slot-meta">
          <span>{{ item.generation === '—' ? 'EPH' : item.generation }}</span><span>·</span><span>{{ item.year || '—' }}</span>
          <span style="margin-left: auto; color: var(--orange); font-weight: 700;">{{ fmtMoney(item.value) }}</span>
        </div>
      </div>
    </div>
    <button class="slot-eject no-print" title="Take off the wall" @click.stop="$emit('eject')">✕</button>
  </div>
</template>

<script setup lang="ts">
import { colorOf, fmtMoney, type Item } from '~/utils/catalog'
const props = defineProps<{ item: Item; dragging: boolean }>()
const emit = defineEmits<{ open: [item: Item]; eject: []; dragstart: [e: DragEvent]; dragend: [] }>()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

function onDragStart(e: DragEvent) {
  try {
    e.dataTransfer?.setData('text/plain', props.item.id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  } catch { /* Safari/older browsers can throw on unsupported setData calls — dragging still works */ }
  emit('dragstart', e)
}
</script>
