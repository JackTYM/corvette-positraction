<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" style="max-width: 380px;" @click.stop>
      <div style="background: var(--ink); color: var(--paper); padding: 12px 18px;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Add This Find</span>
      </div>
      <div style="padding: 22px;">
        <p style="font-style: italic; color: var(--muted); font-size: 15px; margin: 0 0 18px;">Where does this go?</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn primary" style="justify-content: center;" @click="$emit('collection')">Add to My Collection</button>
          <button class="btn ghost" style="justify-content: center; border-color: var(--ink);" :disabled="busy" :style="{ opacity: busy ? 0.5 : 1 }" @click="$emit('wishlist')">{{ busy ? 'Adding…' : 'Add to Wishlist' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ busy?: boolean }>(), { busy: false })
defineEmits<{ collection: []; wishlist: []; close: [] }>()
</script>
