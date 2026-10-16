<template>
  <div class="modal-scrim no-print" @click="$emit('cancel')">
    <div class="modal-card" style="max-width: 440px;" @click.stop>
      <div style="background: var(--ink); color: var(--paper); padding: 12px 18px;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">{{ title }}</span>
      </div>
      <div style="padding: 22px 22px 24px;">
        <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.5;">{{ message }}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn ghost" @click="$emit('cancel')">Cancel</button>
          <button class="btn primary" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; message: string; confirmLabel: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>
