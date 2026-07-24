<template>
  <div class="halftone-dots" :style="{ color, height: `${height}px`, width: '100%', opacity }" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ color?: string; height?: number; opacity?: string | number }>(), {
  color: 'var(--ink)', height: 14, opacity: 'var(--halftone)',
})
</script>
