<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Two</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">The Collection</h2>

    <div class="no-print collection-filters">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 4px;">Filed under</span>
      <button
        v-for="c in cats" :key="c" class="link-tab filter-tab" :class="{ active: filter === c }"
        @click="filter = c"
      >{{ c }}{{ c === 'ALL' ? ` (${items.length})` : ` (${countFor(c)})` }}</button>
    </div>

    <div class="mag-grid">
      <EditorialCard v-for="it in shown" :key="it.id" :item="it" @open="openItem" />
    </div>
    <div v-if="shown.length === 0" class="collection-empty">
      <p style="font-style: italic; font-size: 17px; margin: 0;">Nothing filed under "{{ filter }}" yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Item, Category } from '~/utils/catalog'

const { items, fetchAll } = useItems()
await fetchAll()

const filter = ref<'ALL' | Category>('ALL')
const cats = computed(() => ['ALL', ...new Set(items.value.map((i) => i.category))] as ('ALL' | Category)[])
const shown = computed(() => (filter.value === 'ALL' ? items.value : items.value.filter((i) => i.category === filter.value)))
function countFor(c: Category) { return items.value.filter((i) => i.category === c).length }
function openItem(item: Item) { navigateTo(`/collection/${item.id}`) }
</script>
