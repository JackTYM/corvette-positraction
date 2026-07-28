<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink to="/wishlist" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to Wishlist</NuxtLink>
    <button class="link-tab no-print" style="color: var(--muted); margin-bottom: 20px; margin-left: 16px; background: none; border: none;" @click="onDelete">Remove from Wishlist</button>

    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ item.title }}</h2>

    <div class="editorial-card-photo photo-frame" style="max-width: 420px; margin-bottom: 18px;">
      <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="editorial-card-img" />
      <div v-else class="editorial-card-placeholder">No photo yet</div>
    </div>

    <p v-if="item.estimatedPrice > 0" style="font-size: 18px; margin: 0 0 10px;">Estimated: {{ fmtMoney(item.estimatedPrice) }}</p>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
      <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="display: inline-flex;">View source →</a>
      <NuxtLink :to="`/add?fromWishlist=${item.id}`" class="btn primary no-print" style="display: inline-flex;">I Bought This — Index It</NuxtLink>
    </div>
    <p v-if="item.notes" style="font-style: italic; line-height: 1.5;">{{ item.notes }}</p>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That wishlist entry doesn't exist.</p>
    <NuxtLink to="/wishlist" class="btn" style="margin-top: 16px;">← Back to Wishlist</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/catalog'

const route = useRoute()
const { items, fetchAll, remove: removeWishlistItem } = useWishlist()
const { remove: removeImage } = useImageUpload()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load wishlist items:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)

async function onDelete() {
  if (!item.value) return
  if (!window.confirm(`Remove "${item.value.title}" from your wishlist? This can't be undone.`)) return
  const imgKey = item.value.imgKey
  await removeWishlistItem(item.value.id)
  if (imgKey) {
    try {
      await removeImage(imgKey)
    } catch (err) {
      console.warn('Failed to remove R2 image after wishlist delete:', err)
    }
  }
  await navigateTo('/wishlist')
}
</script>
