<template>
  <div class="wrap" style="padding: 20px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 6px;">Section One</div>
    <h2 style="font-size: clamp(30px, 4.5vw, 44px); line-height: 0.95; margin-bottom: 12px;">Car Collection</h2>

    <div class="no-print" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 18px;">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 2px;">Sort by</span>
      <button
        v-for="k in sortKeys" :key="k" class="link-tab whole-wall-tab" :class="{ suggested: k === 'entered', active: k === activeSort }"
        @click="activeSort = k"
      >{{ ARRANGE_LABELS[k] }}</button>
    </div>

    <CategoryFilterPanel :items="sortedItems" @open="openItem" />
  </div>
</template>

<script setup lang="ts">
import { ARRANGE, ARRANGE_LABELS, isCar, CAR_CATEGORIES, wishlistItemAsCard, type Item } from '~/utils/catalog'

const { items, fetchAll } = useItems()
const { items: wishlistItems, fetchAll: fetchWishlistAll } = useWishlist()
try {
  await fetchAll()
  if (!wishlistItems.value.length) await fetchWishlistAll()
} catch (err) {
  console.warn('Failed to load items for the Collection page:', err)
}

const carItems = computed(() => [
  ...items.value.filter(isCar).map((i) => ({ ...i, owned: true })),
  ...wishlistItems.value.filter((w) => CAR_CATEGORIES.includes(w.category)).map((w) => ({ ...wishlistItemAsCard(w), owned: false })),
])
const sortKeys = Object.keys(ARRANGE_LABELS) as (keyof typeof ARRANGE_LABELS)[]
const activeSort = ref<keyof typeof ARRANGE_LABELS>('entered')
const sortedItems = computed(() => [...carItems.value].sort(ARRANGE[activeSort.value]))

function openItem(item: Item & { owned?: boolean }) {
  navigateTo(item.owned === false ? `/wishlist/${item.id}` : `/collection/${item.id}`)
}
</script>
