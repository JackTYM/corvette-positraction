<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section One</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">The Collection</h2>

    <div class="no-print" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 18px;">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 2px;">Sort by</span>
      <button
        v-for="k in sortKeys" :key="k" class="link-tab whole-wall-tab" :class="{ suggested: k === 'release', active: k === activeSort }"
        @click="activeSort = k"
      >{{ ARRANGE_LABELS[k] }}</button>
    </div>

    <CategoryFilterPanel :items="sortedItems" @open="openItem" />
  </div>
</template>

<script setup lang="ts">
import { ARRANGE, ARRANGE_LABELS, type Item } from '~/utils/catalog'

const { items, fetchAll } = useItems()
try {
  await fetchAll()
} catch (err) {
  console.warn('Failed to load items for the Collection page:', err)
}

const sortKeys = Object.keys(ARRANGE_LABELS) as (keyof typeof ARRANGE_LABELS)[]
const activeSort = ref<keyof typeof ARRANGE_LABELS>('release')
const sortedItems = computed(() => [...items.value].sort(ARRANGE[activeSort.value]))

function openItem(item: Item) { navigateTo(`/collection/${item.id}`) }
</script>
