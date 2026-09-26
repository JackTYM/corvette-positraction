<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink :to="`/share/${userId}`" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to the Catalog</NuxtLink>

    <div class="detail-grid">
      <div>
        <div class="detail-photo photo-frame">
          <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="detail-img" />
          <div v-else class="editorial-card-placeholder">No photo yet</div>
          <div class="halftone-dots" style="position: absolute; inset: 0; color: var(--ink); opacity: calc(var(--halftone) * 0.26); pointer-events: none; mix-blend-mode: multiply;" />
          <div style="position: absolute; top: 18px; left: 18px;"><Stamp :category="item.category" /></div>
        </div>
        <div class="detail-condition">
          <div class="kicker" style="color: var(--orange); margin-bottom: 6px;">Condition</div>
          <p style="margin: 0; font-size: 16px; line-height: 1.5; font-style: italic;">{{ item.condition }}</p>
        </div>
      </div>

      <div>
        <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">{{ item.year }}</div>
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
          <div v-if="item.rarity || item.valueAsOf || item.valueSource" style="width: 100%; margin-top: 10px; font-size: 12px; color: rgba(245,240,232,0.7);">
            <RarityStars :model-value="item.rarity" />
            <span v-if="item.valueAsOf"> · as of {{ fmtDate(item.valueAsOf) }}</span>
            <span v-if="item.valueSource"> · {{ item.valueSource }}</span>
          </div>
        </div>

        <div class="kicker" style="color: var(--orange); margin: 20px 0 8px;">General</div>
        <div class="detail-ledger">
          <div v-for="([k, v], i) in rows" :key="k" class="detail-ledger-row" :style="{ borderBottom: i < rows.length - 1 ? '1px solid var(--rule)' : 'none' }">
            <div class="kicker detail-ledger-key">{{ k }}</div>
            <div style="padding: 10px 14px; font-size: 16px;">{{ v }}</div>
          </div>
        </div>

        <template v-if="attrRows.length">
          <div class="kicker" style="color: var(--orange); margin: 20px 0 8px;">{{ item.category }} Details</div>
          <div class="detail-ledger">
            <div v-for="([k, v], i) in attrRows" :key="k" class="detail-ledger-row" :style="{ borderBottom: i < attrRows.length - 1 ? '1px solid var(--rule)' : 'none' }">
              <div class="kicker detail-ledger-key">{{ k }}</div>
              <div style="padding: 10px 14px; font-size: 16px;">{{ v }}</div>
            </div>
          </div>
        </template>

        <div class="kicker" style="color: var(--orange); margin: 24px 0 8px;">Notes</div>
        <p style="font-size: 17px; line-height: 1.6; margin: 0;">{{ item.story }}</p>

        <div v-if="linkedItems.length" style="margin-top: 24px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Linked Entries</div>
          <div v-for="li in linkedItems" :key="li.linkId" style="padding: 8px 0; border-bottom: 1px solid var(--rule);">
            <NuxtLink :to="itemHref(li.item, `/share/${userId}/item`, `/share/${userId}/catalog`)" style="font-size: 15px;">{{ li.item.title }}</NuxtLink>
          </div>
        </div>

        <div v-if="documents.length" style="margin-top: 24px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Documents</div>
          <div v-for="d in documents" :key="d.id" style="padding: 8px 0; border-bottom: 1px solid var(--rule);">
            <a :href="`${imageBaseUrl}/${d.key}`" target="_blank" rel="noopener" style="font-size: 15px;">{{ d.filename }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That item isn't in this archive.</p>
    <NuxtLink :to="`/share/${userId}`" class="btn" style="margin-top: 16px;">← Back to the Catalog</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, fmtDate, GENERATIONS, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, itemHref, type Generation, type Item } from '~/utils/catalog'
import type { ItemLink } from '~/composables/useItemLinks'
import type { ItemDocument } from '~/composables/useItemDocuments'

definePageMeta({ layout: 'share' })

const route = useRoute()
const userId = route.params.userId as string
const itemId = route.params.itemId as string
const { items, fetchItems, fetchLinksForItem, fetchDocumentsForItem, otherItemId } = useSharedCollection(userId)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchItems()
  } catch (err) {
    console.warn('Failed to load shared item:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === itemId) || null)

const links = ref<ItemLink[]>([])
const documents = ref<ItemDocument[]>([])

if (item.value) {
  try {
    links.value = await fetchLinksForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load linked entries:', err)
  }
  try {
    documents.value = await fetchDocumentsForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load documents:', err)
  }
}

const linkedItems = computed(() => {
  if (!item.value) return [] as { linkId: string; item: Item }[]
  return links.value
    .map((l) => {
      const otherId = otherItemId(l, item.value!.id)
      const found = items.value.find((i) => i.id === otherId)
      return found ? { linkId: l.id, item: found } : null
    })
    .filter((x): x is { linkId: string; item: Item } => x !== null)
})

const gain = computed(() => (item.value ? item.value.value - item.value.pricePaid : 0))
const rows = computed(() => {
  if (!item.value) return [] as [string, string][]
  return [
    ['Year', String(item.value.year)],
    ['Acquired', fmtDate(item.value.acquired)],
    ['Price Paid', fmtMoney(item.value.pricePaid)],
    ['Location', item.value.location],
    ['Production Date', fmtDate(item.value.productionDate)],
  ] as [string, string][]
})

const attrRows = computed<[string, string][]>(() => {
  if (!item.value) return []
  const out: [string, string][] = []
  if (CATEGORY_HAS_GENERATION[item.value.category]) {
    const g = item.value.generation !== '—' ? GENERATIONS[item.value.generation as Exclude<Generation, '—'>] : undefined
    out.push(['Generation', item.value.generation === '—' ? 'Ephemera' : `${item.value.generation} — ${g ? g.name : ''}`])
  }
  for (const f of CATEGORY_FIELDS[item.value.category]) {
    if (f.showWhen && item.value.attributes[f.showWhen.key] !== f.showWhen.equals) continue
    const raw = item.value.attributes[f.key]
    let display: string
    if (f.type === 'checkbox') display = raw ? 'Yes' : 'No'
    else if (f.type === 'date') display = fmtDate(raw as string)
    else display = raw != null && raw !== '' ? String(raw) : '—'
    out.push([f.label, display])
  }
  return out
})
</script>
