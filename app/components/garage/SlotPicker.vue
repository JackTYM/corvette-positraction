<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">{{ title }}</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="max-height: 60vh; overflow-y: auto;">
        <div v-if="candidates.length === 0" style="padding: 30px 20px; text-align: center; font-style: italic; color: var(--muted);">
          {{ emptyMessage }}
        </div>
        <button v-for="it in candidates" :key="it.id" class="pick-row" @click="$emit('pick', it.id)">
          <span class="pick-swatch" :style="{ background: colorOf(it).hex }" />
          <span style="flex: 1; text-align: left; min-width: 0;">
            <span v-if="!it.owned" style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; color: var(--orange); display: block;">Wishlist</span>
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 17px; display: block; line-height: 1;">{{ it.title }}</span>
            <span style="font-family: var(--font-cond); font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;">{{ it.generation === '—' ? 'Ephemera' : it.generation }} · {{ it.year }} · {{ colorOf(it).name }}</span>
          </span>
          <span class="value-note" style="font-size: 18px;">{{ fmtMoney(it.value) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { colorOf, fmtMoney, type WallCard } from '~/utils/catalog'
withDefaults(defineProps<{ candidates: WallCard[]; title?: string; emptyMessage?: string }>(), {
  title: 'Shelve a Car Here',
  emptyMessage: 'Every car is already on the wall. Drag one between slots to re-file it.',
})
defineEmits<{ pick: [id: string]; close: [] }>()
</script>
