<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <button class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; background: none; border: none;" @click="$router.back()">← Back to the Collection</button>

    <div class="detail-grid">
      <div>
        <div class="detail-photo photo-frame">
          <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="detail-img" />
          <div v-else class="editorial-card-placeholder">No photo yet</div>
          <div class="halftone-dots" style="position: absolute; inset: 0; color: var(--ink); opacity: calc(var(--halftone) * 0.26); pointer-events: none; mix-blend-mode: multiply;" />
          <div style="position: absolute; top: 18px; left: 18px;"><Stamp :category="item.category" /></div>
        </div>
        <div class="detail-condition">
          <div class="kicker" style="color: var(--orange); margin-bottom: 6px;">Condition Report</div>
          <p style="margin: 0; font-size: 16px; line-height: 1.5; font-style: italic;">{{ item.condition }}</p>
        </div>
      </div>

      <div>
        <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">{{ item.year }} · {{ item.maker }}</div>
        <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92;">{{ item.title }}</h2>
        <p style="font-style: italic; color: var(--muted); font-size: 18px; margin: 10px 0 0;">{{ item.sub }}</p>

        <div class="detail-value-banner">
          <div>
            <div class="kicker" style="color: rgba(245,240,232,0.6); font-size: 10.5px;">Estimated Value</div>
            <ValueNote :value="item.value" :size="46" style="color: var(--orange);" />
          </div>
          <div class="detail-gain">
            <div>Paid <strong>{{ fmtMoney(item.pricePaid) }}</strong></div>
            <div :style="{ color: gain >= 0 ? 'var(--orange)' : '#e0a', fontFamily: 'var(--font-cond)', letterSpacing: '0.06em' }">
              {{ gain >= 0 ? '▲' : '▼' }} {{ fmtMoney(Math.abs(gain)) }} {{ gain >= 0 ? 'appreciation' : 'softening' }}
            </div>
          </div>
        </div>

        <div class="detail-ledger">
          <div v-for="([k, v], i) in rows" :key="k" class="detail-ledger-row" :style="{ borderBottom: i < rows.length - 1 ? '1px solid var(--rule)' : 'none' }">
            <div class="kicker detail-ledger-key">{{ k }}</div>
            <div style="padding: 10px 14px; font-size: 16px;">{{ v }}</div>
          </div>
        </div>

        <div class="kicker" style="color: var(--orange); margin: 24px 0 8px;">Provenance & Notes</div>
        <p class="dropcap" style="font-size: 17px; line-height: 1.6; margin: 0;">{{ item.story }}</p>
      </div>
    </div>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That item isn't in your archive.</p>
    <NuxtLink to="/collection" class="btn" style="margin-top: 16px;">← Back to the Collection</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, fmtDate, GENERATIONS, type Generation } from '~/utils/catalog'

const route = useRoute()
const { items, fetchAll } = useItems()
if (!items.value.length) await fetchAll()

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

const gain = computed(() => (item.value ? item.value.value - item.value.pricePaid : 0))
const rows = computed(() => {
  if (!item.value) return [] as [string, string][]
  const g = item.value.generation !== '—' ? GENERATIONS[item.value.generation as Exclude<Generation, '—'>] : undefined
  return [
    ['Year', String(item.value.year)],
    ['Generation', item.value.generation === '—' ? 'Ephemera' : `${item.value.generation} — ${g ? g.name : ''}`],
    ['Scale / Format', item.value.scale],
    ['Maker', item.value.maker],
    ['Acquired', fmtDate(item.value.acquired)],
    ['Price Paid', fmtMoney(item.value.pricePaid)],
    ['Location', item.value.location],
  ] as [string, string][]
})
</script>
