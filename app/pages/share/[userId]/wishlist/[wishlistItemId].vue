<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink :to="`/share/${userId}`" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to the Collection</NuxtLink>

    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ item.title }}</h2>

    <div class="editorial-card-photo photo-frame" style="max-width: 420px; margin-bottom: 18px;">
      <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="editorial-card-img" />
      <div v-else class="editorial-card-placeholder">No photo yet</div>
    </div>

    <p v-if="item.estimatedPrice > 0" style="font-size: 18px; margin: 0 0 10px;">Estimated: {{ fmtMoney(item.estimatedPrice) }}</p>
    <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="display: inline-flex; margin-bottom: 14px;">View source →</a>
    <p v-if="item.notes" style="font-style: italic; line-height: 1.5;">{{ item.notes }}</p>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That wishlist entry isn't in this archive.</p>
    <NuxtLink :to="`/share/${userId}`" class="btn" style="margin-top: 16px;">← Back to the Collection</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/catalog'

definePageMeta({ layout: 'share' })

const route = useRoute()
const userId = route.params.userId as string
const wishlistItemId = route.params.wishlistItemId as string
const { wishlistItems, fetchWishlistItems } = useSharedCollection(userId)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!wishlistItems.value.length) {
  try {
    await fetchWishlistItems()
  } catch (err) {
    console.warn('Failed to load shared wishlist item:', err)
  }
}

const item = computed(() => wishlistItems.value.find((i) => i.id === wishlistItemId) || null)
</script>
