<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Three</div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
      <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9;">Wishlist</h2>
      <button class="btn primary no-print" @click="showModal = true">+ Add to Wishlist</button>
    </div>

    <div v-if="items.length > 1" class="no-print" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 18px;">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 2px;">Sort by</span>
      <button
        v-for="k in sortKeys" :key="k" class="link-tab whole-wall-tab" :class="{ suggested: k === 'release', active: k === activeSort }"
        @click="activeSort = k"
      >{{ ARRANGE_LABELS[k] }}</button>
    </div>

    <div class="mag-grid">
      <NuxtLink v-for="w in sortedItems" :key="w.id" :to="`/wishlist/${w.id}`" class="editorial-card" style="text-decoration: none; color: inherit;">
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
    <p v-if="items.length === 0" style="font-style: italic; color: var(--muted);">Nothing on your wishlist yet.</p>

    <WishlistAddModal v-if="showModal" @close="showModal = false" @saved="showModal = false" />
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, ARRANGE, ARRANGE_LABELS, wishlistItemAsCard } from '~/utils/catalog'

const { items, fetchAll } = useWishlist()
const showModal = ref(false)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load wishlist items:', err)
  }
}

const sortKeys: (keyof typeof ARRANGE_LABELS)[] = ['release', 'date', 'value']
const activeSort = ref<keyof typeof ARRANGE_LABELS>('release')
const sortedItems = computed(() =>
  [...items.value].sort((a, b) => ARRANGE[activeSort.value](wishlistItemAsCard(a), wishlistItemAsCard(b))),
)
</script>
