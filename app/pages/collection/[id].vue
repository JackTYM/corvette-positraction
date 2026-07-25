<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <button class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; background: none; border: none;" @click="$router.back()">← Back to the Collection</button>
    <button class="link-tab no-print" style="color: var(--muted); margin-bottom: 20px; margin-left: 16px; background: none; border: none;" @click="onDelete">Remove from Archive</button>

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

        <div class="kicker" style="color: var(--orange); margin: 24px 0 8px;">Provenance & Notes</div>
        <p class="dropcap" style="font-size: 17px; line-height: 1.6; margin: 0;">{{ item.story }}</p>

        <div class="no-print" style="margin-top: 24px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Linked Entries</div>
          <div v-for="li in linkedItems" :key="li.linkId" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--rule);">
            <NuxtLink :to="`/collection/${li.item.id}`" style="font-size: 15px;">{{ li.item.title }}</NuxtLink>
            <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="onUnlink(li.linkId)">unlink</button>
          </div>
          <button class="btn ghost" style="margin-top: 10px; font-size: 12px; padding: 7px 13px;" @click="showLinkPicker = true">+ Link an Entry</button>
        </div>

        <div class="no-print" style="margin-top: 24px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Documents</div>
          <div v-for="d in documents" :key="d.id" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--rule);">
            <a :href="`${imageBaseUrl}/${d.key}`" target="_blank" rel="noopener" style="font-size: 15px;">{{ d.filename }}</a>
            <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="onRemoveDocument(d)">remove</button>
          </div>
          <label class="btn ghost" style="margin-top: 10px; font-size: 12px; padding: 7px 13px; cursor: pointer;">
            + Attach a Document
            <input type="file" accept=".pdf,image/*" multiple style="display: none;" @change="onDocFiles" />
          </label>
        </div>
      </div>
    </div>

    <SlotPicker v-if="showLinkPicker" title="Link an Entry" empty-message="No other items to link yet." :candidates="linkCandidates" @close="showLinkPicker = false" @pick="onLink" />
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That item isn't in your archive.</p>
    <NuxtLink to="/collection" class="btn" style="margin-top: 16px;">← Back to the Collection</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, fmtDate, GENERATIONS, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, CAR_CATEGORIES, type Generation, type Item } from '~/utils/catalog'
import { otherItemId, type ItemLink } from '~/composables/useItemLinks'
import type { ItemDocument } from '~/composables/useItemDocuments'

const route = useRoute()
const { items, fetchAll, remove: removeItem } = useItems()
const { remove: removeImage } = useImageUpload()
const { fetchForItem: fetchLinksForItem, create: createLink, remove: removeLink } = useItemLinks()
const { fetchForItem: fetchDocsForItem, create: createDocument, remove: removeDocumentRow } = useItemDocuments()
const { upload: uploadDoc, remove: removeDocumentFile } = useDocumentUpload()

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load items for the Item Detail page:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)

const links = ref<ItemLink[]>([])
const documents = ref<ItemDocument[]>([])

async function loadRelated() {
  if (!item.value) return
  try {
    links.value = await fetchLinksForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load linked entries:', err)
  }
  try {
    documents.value = await fetchDocsForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load documents:', err)
  }
}
await loadRelated()

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

const showLinkPicker = ref(false)
const linkCandidates = computed(() => {
  if (!item.value) return [] as Item[]
  const linkedIds = new Set(links.value.map((l) => otherItemId(l, item.value!.id)))
  return items.value.filter((i) => i.id !== item.value!.id && !linkedIds.has(i.id))
})
async function onLink(candidateId: string) {
  if (!item.value) return
  showLinkPicker.value = false
  try {
    const link = await createLink(item.value.id, candidateId)
    links.value = [...links.value, link]
  } catch (err) {
    console.warn('Failed to create linked entry:', err)
  }
}
async function onUnlink(linkId: string) {
  try {
    await removeLink(linkId)
    links.value = links.value.filter((l) => l.id !== linkId)
  } catch (err) {
    console.warn('Failed to remove linked entry:', err)
  }
}

async function onDocFiles(e: Event) {
  if (!item.value) return
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  for (const file of files) {
    try {
      const uploaded = await uploadDoc(file)
      const doc = await createDocument(item.value.id, uploaded)
      documents.value = [...documents.value, doc]
    } catch (err) {
      console.warn('Failed to attach document:', err)
    }
  }
}
async function onRemoveDocument(d: ItemDocument) {
  if (!window.confirm(`Remove "${d.filename}"?`)) return
  try {
    await removeDocumentRow(d.id)
    documents.value = documents.value.filter((x) => x.id !== d.id)
  } catch (err) {
    console.warn('Failed to remove document row:', err)
    return
  }
  try {
    await removeDocumentFile(d.key)
  } catch (err) {
    console.warn('Failed to remove R2 document after row delete:', err)
  }
}

async function onDelete() {
  if (!item.value) return
  if (!window.confirm(`Remove "${item.value.title}" from your archive? This can't be undone.`)) return
  const imgKey = item.value.imgKey
  const docKeys = documents.value.map((d) => d.key)
  await removeItem(item.value.id)
  if (imgKey) {
    try { await removeImage(imgKey) } catch (err) { console.warn('Failed to remove R2 image after item delete:', err) }
  }
  for (const key of docKeys) {
    try { await removeDocumentFile(key) } catch (err) { console.warn('Failed to remove R2 document after item delete:', err) }
  }
  await navigateTo('/collection')
}
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

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
  if (CAR_CATEGORIES.includes(item.value.category)) {
    out.push(['Scale / Format', item.value.scale])
    out.push(['Maker', item.value.maker])
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
