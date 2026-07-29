<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <template v-if="notFound">
      <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Shared Archive</div>
      <p style="font-style: italic; color: var(--muted); font-size: 17px;">This collection isn't public.</p>
    </template>
    <template v-else>
      <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">A Shared Archive</div>
      <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 24px;">The Collection</h2>
      <div class="mag-grid">
        <EditorialCard v-for="it in items" :key="it.id" :item="it" @open="openItem" />
      </div>
      <p v-if="items.length === 0" style="font-style: italic; color: var(--muted);">Nothing catalogued yet.</p>

      <h2 style="font-size: clamp(30px, 5vw, 48px); line-height: 0.9; margin: 48px 0 24px;">Wishlist</h2>
      <div class="mag-grid">
        <NuxtLink
          v-for="w in wishlistItems" :key="w.id"
          :to="`/share/${userId}/wishlist/${w.id}`"
          class="editorial-card" style="text-decoration: none; color: inherit;"
        >
          <div class="editorial-card-photo photo-frame">
            <img v-if="w.imgKey" :src="`${imageBaseUrl}/${w.imgKey}`" :alt="w.title" class="editorial-card-img" />
            <div v-else class="editorial-card-placeholder">No photo yet</div>
          </div>
          <div style="padding: 10px 12px;">
            <div style="font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.1; margin-bottom: 4px;">{{ w.title }}</div>
            <div v-if="w.estimatedPrice > 0" class="kicker" style="color: var(--muted); font-size: 11px;">{{ fmtMoney(w.estimatedPrice) }}</div>
          </div>
        </NuxtLink>
      </div>
      <p v-if="wishlistItems.length === 0" style="font-style: italic; color: var(--muted);">Nothing on the wishlist yet.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, type Item } from '~/utils/catalog'

definePageMeta({ layout: 'share' })

const route = useRoute()
const userId = route.params.userId as string
const { items, wishlistItems, fetchItems, fetchWishlistItems } = useSharedCollection(userId)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl
const notFound = ref(false)

try {
  await Promise.all([fetchItems(), fetchWishlistItems()])
  notFound.value = items.value.length === 0 && wishlistItems.value.length === 0
} catch (err) {
  console.warn('Failed to load shared collection:', err)
  notFound.value = true
}

function openItem(item: Item) {
  navigateTo(`/share/${userId}/item/${item.id}`)
}
</script>
