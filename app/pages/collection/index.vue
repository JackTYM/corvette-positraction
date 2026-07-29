<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Two</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">The Collection</h2>

    <CategoryFilterPanel :items="items" @open="openItem" />
  </div>
</template>

<script setup lang="ts">
import type { Item } from '~/utils/catalog'

const { items, fetchAll } = useItems()
try {
  await fetchAll()
} catch (err) {
  console.warn('Failed to load items for the Collection page:', err)
}

function openItem(item: Item) { navigateTo(`/collection/${item.id}`) }
</script>
