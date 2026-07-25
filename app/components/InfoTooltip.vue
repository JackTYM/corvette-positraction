<template>
  <span style="position: relative; display: inline-block;">
    <button
      type="button"
      aria-label="More information"
      style="width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid var(--muted); color: var(--muted); font-size: 10px; font-style: italic; font-family: Georgia, serif; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: help; background: none; padding: 0;"
      @click="open = !open"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >i</button>
    <div
      v-if="open || hovering"
      class="no-print"
      style="position: absolute; z-index: 20; top: 21px; left: 0; width: 320px; max-height: 320px; overflow-y: auto; background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 4px 4px 0 rgba(0,0,0,0.15); padding: 14px 16px; font-size: 12.5px; line-height: 1.5; text-transform: none; letter-spacing: normal; font-family: var(--font-body, inherit); color: var(--ink);"
    >
      <slot />
    </div>
  </span>
</template>

<script setup lang="ts">
const open = ref(false)
const hovering = ref(false)
</script>
