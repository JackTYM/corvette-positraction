<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Look Up a Reference Model</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="padding: 10px 14px; border-bottom: 1.5px solid var(--rule);">
        <input v-model="filter" placeholder="Search by name…" style="width: 100%; border: none; font-size: 15px; padding: 6px 2px; background: none;" />
      </div>
      <div style="max-height: 60vh; overflow-y: auto;">
        <div v-if="filtered.length === 0" style="padding: 30px 20px; text-align: center; font-style: italic; color: var(--muted);">
          No matching reference models.
        </div>
        <button v-for="m in filtered" :key="m.id" class="pick-row" @click="$emit('pick', m)">
          <span style="flex: 1; text-align: left; min-width: 0;">
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 16px; display: block; line-height: 1;">{{ m.name }}</span>
            <span style="font-family: var(--font-cond); font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;">{{ m.manufacturer }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel } from '~/composables/useDiecastReference'

const props = defineProps<{ models: DiecastModel[] }>()
defineEmits<{ pick: [model: DiecastModel]; close: [] }>()

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return props.models
  return props.models.filter((m) => m.name.toLowerCase().includes(q))
})
</script>
