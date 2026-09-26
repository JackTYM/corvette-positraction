<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <template v-if="notFound">
      <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Shared Archive</div>
      <p style="font-style: italic; color: var(--muted); font-size: 17px;">This collection isn't public.</p>
    </template>
    <template v-else>
      <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">A Shared Archive</div>
      <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">
        {{ activeTab === 'collection' ? 'Car Collection' : activeTab === 'catalog' ? 'The Catalog' : 'Wishlist' }}
      </h2>

      <div class="no-print collection-filters">
        <button class="link-tab filter-tab" :class="{ active: activeTab === 'collection' }" @click="activeTab = 'collection'">Car Collection ({{ carItems.length }})</button>
        <button class="link-tab filter-tab" :class="{ active: activeTab === 'catalog' }" @click="activeTab = 'catalog'">Catalog ({{ catalogItems.length }})</button>
        <button class="link-tab filter-tab" :class="{ active: activeTab === 'wishlist' }" @click="activeTab = 'wishlist'">Wishlist ({{ wishlistItems.length }})</button>
      </div>

      <template v-if="activeTab === 'collection'">
        <div style="margin-top: 14px;">
          <CategoryFilterPanel :items="carItems" @open="openCarItem" />
        </div>
      </template>

      <template v-else-if="activeTab === 'catalog'">
        <div style="margin-top: 14px;">
          <CategoryFilterPanel :items="catalogItems" @open="openCatalogItem" />
        </div>
      </template>

      <template v-else>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, isCar, type Item } from '~/utils/catalog'

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

const carItems = computed(() => items.value.filter(isCar))
const catalogItems = computed(() => items.value.filter((i) => !isCar(i)))

const activeTab = ref<'collection' | 'catalog' | 'wishlist'>('collection')

function openCarItem(item: Item) { navigateTo(`/share/${userId}/item/${item.id}`) }
function openCatalogItem(item: Item) { navigateTo(`/share/${userId}/catalog/${item.id}`) }
</script>
