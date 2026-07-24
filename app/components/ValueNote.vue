<template>
  <span class="value-note" :style="{ fontSize: `${size}px` }">{{ fmtMoney(value) }}</span>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/catalog'
withDefaults(defineProps<{ value: number; size?: number }>(), { size: 30 })
</script>
