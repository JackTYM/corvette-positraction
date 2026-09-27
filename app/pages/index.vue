<template>
  <div class="wrap" style="padding: 20px 26px 70px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
      <div>
        <div class="kicker" style="color: var(--orange); margin-bottom: 6px;">In This Issue</div>
        <h2 style="font-size: clamp(30px, 4.5vw, 44px); line-height: 0.95; white-space: nowrap;">Table of Contents</h2>
      </div>
      <p style="max-width: 360px; font-style: italic; color: var(--ink-soft); font-size: 15px; line-height: 1.4; margin: 0;">
        A working archive of one lifetime spent chasing the plastic, paper, and porcelain of America's sports car — 1953 to the present day.
      </p>
    </div>

    <hr class="rule-thick" style="margin: 16px 0 0;" />
    <HalftoneBand color="var(--ink)" :height="9" opacity="calc(var(--halftone) * 0.5)" />

    <div class="figures-ledger">
      <div v-for="(f, i) in figures" :key="i" class="figure-cell">
        <div class="figure-num">{{ f.n }}</div>
        <div class="kicker" style="margin-top: 8px; color: var(--muted); font-size: 11px;">{{ f.label }}</div>
      </div>
    </div>

    <div class="toc-grid">
      <section v-if="featured">
        <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">★ The Featured Find</div>
        <div class="featured-card" @click="openItem(featured)">
          <div class="featured-photo photo-frame">
            <img v-if="featured.imgKey" :src="`${imageBaseUrl}/${featured.imgKey}`" :alt="featured.title" class="featured-img" />
            <div v-else class="editorial-card-placeholder">No photo yet</div>
            <div class="halftone-dots" style="position: absolute; inset: 0; color: var(--ink); opacity: calc(var(--halftone) * 0.28); pointer-events: none; mix-blend-mode: multiply;" />
            <div style="position: absolute; top: 16px; left: 16px;"><Stamp :category="featured.category" /></div>
            <div class="featured-value"><ValueNote :value="featured.value" :size="44" /></div>
          </div>
          <div style="padding: 18px 20px 20px;">
            <div class="kicker" style="color: var(--orange); margin-bottom: 7px;">{{ CAR_CATEGORIES.includes(featured.category) ? `${featured.year} · ${featured.generation} · ${featured.maker}` : `${featured.year} · ${featured.generation}` }}</div>
            <h3 style="font-size: 34px; line-height: 0.95; margin-bottom: 8px;">{{ featured.title }}</h3>
            <p style="font-size: 16px; line-height: 1.5; color: var(--ink-soft); margin: 0;">{{ featured.story }}</p>
            <div class="btn ghost" style="margin-top: 16px; border-color: var(--ink); pointer-events: none;">Read the full entry →</div>
          </div>
        </div>
      </section>

      <section>
        <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">The Holdings, By Era</div>
        <GenContents :items="items" @open="openItem" />
        <div style="display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap;">
          <NuxtLink to="/collection" class="btn primary" style="flex: 1 1 180px; justify-content: center;">Browse the Collection →</NuxtLink>
          <NuxtLink to="/garage" class="btn" style="flex: 1 1 140px; justify-content: center;">Walk the Garage →</NuxtLink>
        </div>

        <div v-if="rareWishlistItems.length > 0" style="margin-top: 28px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">★ On the Wishlist — Rare Finds</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <NuxtLink
              v-for="w in rareWishlistItems" :key="w.id" :to="`/wishlist/${w.id}`"
              style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border: 1.5px dashed var(--orange-deep); text-decoration: none; color: inherit;"
            >
              <span style="font-family: var(--font-display); font-weight: 700; font-size: 15px;">{{ w.title }}</span>
              <span v-if="w.estimatedPrice > 0" class="kicker" style="color: var(--muted); font-size: 11px;">{{ fmtMoney(w.estimatedPrice) }}</span>
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { stats, fmtMoney, isCar, isRareCarItem, CAR_CATEGORIES, type Item } from '~/utils/catalog'

const { items, fetchAll } = useItems()
const { wall, fetchWall } = useWall('garage')
const { items: wishlistItems, fetchAll: fetchWishlistAll } = useWishlist()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

try {
  await Promise.all([fetchAll(), fetchWall(), fetchWishlistAll()])
} catch (err) {
  console.warn('Failed to load items/wall for the Contents page:', err)
}

const s = computed(() => stats(items.value))
const carItems = computed(() => items.value.filter(isCar))
const rareCarItems = computed(() => carItems.value.filter(isRareCarItem))
const featured = computed(() => {
  if (rareCarItems.value.length > 0) {
    return rareCarItems.value[Math.floor(Math.random() * rareCarItems.value.length)]
  }
  return items.value.find((i) => i.featured) || items.value[0] || null
})
const rareWishlistItems = computed(() =>
  wishlistItems.value.filter((w) => CAR_CATEGORIES.includes(w.category) && w.isRare),
)
const figures = computed(() => [
  { n: carItems.value.length, label: 'Total Cars' },
  { n: wishlistItems.value.length, label: 'On the Wishlist' },
  { n: fmtMoney(s.value.value), label: 'Archive Value' },
  { n: s.value.gens, label: 'Generations Held' },
  { n: wall.value.cases.length, label: 'Display Cases' },
  { n: s.value.total ? `${s.value.earliest}–${String(s.value.latest).slice(2)}` : '—', label: 'Years Spanned' },
])

function openItem(item: Item) {
  navigateTo(`/collection/${item.id}`)
}
</script>
