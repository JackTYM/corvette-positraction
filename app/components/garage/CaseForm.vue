<template>
  <div class="modal-scrim no-print" @click="$emit('cancel')">
    <div class="modal-card" style="max-width: 440px;" @click.stop>
      <div style="background: var(--ink); color: var(--paper); padding: 12px 18px;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">{{ initial ? 'Edit This Case' : 'Build a Display Case' }}</span>
      </div>
      <div style="padding: 22px 22px 24px;">
        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 4px;">What do you call it?</span>
          <input v-model="name" placeholder="e.g. Left Wall Case" style="border-bottom: 2px solid var(--ink); padding: 5px 2px; font-family: var(--font-display); font-weight: 700; font-size: 22px;" />
        </label>
        <div style="display: flex; gap: 22px; align-items: flex-end;">
          <label style="flex: 1;">
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 4px;">Columns across</span>
            <input v-model.number="cols" type="number" min="1" max="20" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 18px;" />
          </label>
          <span style="font-family: var(--font-display); font-weight: 800; font-size: 22px; padding-bottom: 4px;">×</span>
          <label style="flex: 1;">
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 4px;">Rows down</span>
            <input v-model.number="rows" type="number" min="1" max="20" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 18px;" />
          </label>
        </div>
        <div style="margin-top: 14px; font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; color: var(--muted);">
          Holds <strong style="color: var(--orange);">{{ cols * rows }} cars</strong>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 22px; justify-content: flex-end;">
          <button class="btn ghost" @click="$emit('cancel')">Cancel</button>
          <button class="btn primary" @click="save">{{ initial ? 'Save Changes' : 'Build It' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WallCase } from '~/composables/useWall'

const props = defineProps<{ initial?: WallCase | null }>()
const emit = defineEmits<{ save: [value: { name: string; cols: number; rows: number }]; cancel: [] }>()

const name = ref(props.initial?.name ?? '')
const cols = ref(props.initial?.cols ?? 4)
const rows = ref(props.initial?.rows ?? 3)

function clamp(v: number) { return Math.max(1, Math.min(20, Math.round(v) || 1)) }
function save() {
  emit('save', { name: name.value.trim() || 'Untitled Case', cols: clamp(cols.value), rows: clamp(rows.value) })
}
</script>
