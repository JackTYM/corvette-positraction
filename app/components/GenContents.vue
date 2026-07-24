<template>
  <div class="gen-contents">
    <div v-for="k in keys" :key="k" class="gen-contents-group">
      <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;">
        <span class="gen-contents-code">{{ k === '—' ? 'Ephemera' : k }}</span>
        <span class="gen-contents-sub">{{ subtitle(k) }}</span>
      </div>
      <div
        v-for="it in groups[k]" :key="it.id" class="toc-line"
        style="display: flex; align-items: baseline; cursor: pointer; padding: 4px 0; font-size: 15.5px;"
        @click="$emit('open', it)"
      >
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ it.title }}</span>
        <span style="flex: 1; border-bottom: 1.5px dotted var(--rule); margin: 0 7px 4px;" />
        <span style="font-family: var(--font-cond); font-size: 12.5px; color: var(--muted); white-space: nowrap;">{{ it.category }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GENERATIONS, GEN_ORDER, type Item, type Generation } from '~/utils/catalog'

const props = defineProps<{ items: Item[] }>()
defineEmits<{ open: [item: Item] }>()

const groups = computed(() => {
  const g: Record<string, Item[]> = {}
  for (const item of props.items) {
    (g[item.generation] ??= []).push(item)
  }
  return g
})
const keys = computed(() => GEN_ORDER.filter((k) => groups.value[k]?.length))

function subtitle(k: string): string {
  const g = k !== '—' ? GENERATIONS[k as Exclude<Generation, '—'>] : undefined
  return g ? `${g.name} · ${g.years}` : 'Signs · Badges · Paper'
}
</script>
