<template>
  <span v-if="!gen || gen === '—'" class="gen-tag" style="opacity: 0.55;">NO GEN</span>
  <span v-else class="gen-tag" :title="title">{{ gen }}</span>
</template>

<script setup lang="ts">
import { GENERATIONS, type Generation } from '~/utils/catalog'
const props = defineProps<{ gen: Generation }>()
const title = computed(() => {
  if (props.gen === '—') return props.gen
  const g = GENERATIONS[props.gen as Exclude<Generation, '—'>]
  return g ? `${g.name} · ${g.years}` : props.gen
})
</script>
