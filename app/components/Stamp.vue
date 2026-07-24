<template>
  <span class="stamp" :class="`tone-${tone}`">
    <span class="stamp-dot" />{{ category }}
  </span>
</template>

<script setup lang="ts">
import { CATEGORIES, type Category } from '~/utils/catalog'
const props = defineProps<{ category: Category }>()
const tone = computed(() => CATEGORIES[props.category] ?? 'ink')
</script>
