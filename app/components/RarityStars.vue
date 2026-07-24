<template>
  <span class="rarity-stars" :style="{ cursor: editable ? 'pointer' : 'default' }">
    <span
      v-for="n in 3" :key="n"
      :style="{ color: n <= (modelValue || 0) ? 'var(--orange)' : 'var(--rule)', fontSize: '18px' }"
      @click="editable && $emit('update:modelValue', modelValue === n ? null : n)"
    >★</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number | null; editable?: boolean }>()
defineEmits<{ 'update:modelValue': [value: number | null] }>()
</script>
