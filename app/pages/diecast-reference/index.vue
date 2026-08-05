<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Reference</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">Diecast Reference</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px; max-width: 640px;">
      Every known diecast Corvette release, sourced from <a href="https://smalldiecastcorvettes.com" target="_blank" rel="noopener">smalldiecastcorvettes.com</a>. Click a picture to add it to your archive.
    </p>

    <div v-if="manufacturers.length" class="no-print" style="display: flex; flex-wrap: wrap; row-gap: 6px; column-gap: 8px; border-bottom: 2px solid var(--ink); margin-bottom: 24px;">
      <button
        v-for="m in manufacturers"
        :key="m"
        type="button"
        class="link-tab"
        :style="{ padding: '8px 16px', borderBottom: m === activeManufacturer ? '3px solid var(--orange)' : '3px solid transparent', fontWeight: m === activeManufacturer ? 700 : 400 }"
        @click="activeManufacturer = m"
      >{{ m }}</button>
    </div>

    <div v-if="availableGenerations.length" class="no-print" style="display: flex; flex-wrap: wrap; row-gap: 6px; column-gap: 8px; border-bottom: 1px solid var(--ink); margin-bottom: 24px;">
      <button
        type="button"
        class="link-tab"
        :style="{ padding: '8px 16px', borderBottom: activeGeneration === 'All' ? '3px solid var(--orange)' : '3px solid transparent', fontWeight: activeGeneration === 'All' ? 700 : 400 }"
        @click="activeGeneration = 'All'"
      >All</button>
      <button
        v-for="g in availableGenerations"
        :key="g"
        type="button"
        class="link-tab"
        :style="{ padding: '8px 16px', borderBottom: g === activeGeneration ? '3px solid var(--orange)' : '3px solid transparent', fontWeight: g === activeGeneration ? 700 : 400 }"
        @click="activeGeneration = g"
      >{{ g === '—' ? 'Unknown' : g }}</button>
    </div>

    <div v-for="model in modelsForActiveTab" :key="model.id" style="margin-bottom: 36px;">
      <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">{{ model.name }}</div>
      <div class="mag-grid">
        <div v-for="v in variantsByModel[model.id] ?? []" :key="v.id" class="editorial-card">
          <NuxtLink
            :to="addedLookup.get(v.id) ? (addedLookup.get(v.id)?.type === 'collection' ? `/collection/${addedLookup.get(v.id)?.id}` : `/wishlist/${addedLookup.get(v.id)?.id}`) : `/add?fromVariant=${v.id}`"
            style="text-decoration: none; color: inherit; display: block;"
          >
            <div class="editorial-card-photo photo-frame">
              <img :src="v.imageUrl" :alt="v.caption || model.name" class="editorial-card-img" />
              <div
                v-if="addedLookup.get(v.id)"
                style="position: absolute; top: 8px; left: 8px; background: var(--ink); color: var(--paper); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 7px; font-family: var(--font-cond);"
              >
                {{ addedLookup.get(v.id)?.type === 'collection' ? 'In Collection' : 'In Wishlist' }}
              </div>
            </div>
            <div style="padding: 10px 12px; font-size: 13.5px; line-height: 1.4;">
              <p v-if="v.caption" style="margin: 0 0 8px;">{{ v.caption }}</p>
              <span v-if="addedLookup.get(v.id)" class="btn ghost" style="font-size: 11px; padding: 5px 10px; display: inline-block;">{{ addedLookup.get(v.id)?.type === 'collection' ? 'View Collection →' : 'View Wishlist →' }}</span>
            </div>
          </NuxtLink>
          <div v-if="!addedLookup.get(v.id)" class="no-print" style="padding: 0 12px 12px; display: flex; gap: 8px;">
            <NuxtLink :to="`/add?fromVariant=${v.id}`" class="btn primary" style="font-size: 11px; padding: 5px 10px;">Index</NuxtLink>
            <button
              type="button"
              class="btn ghost"
              :style="{ fontSize: '11px', padding: '5px 10px', opacity: wishlistBusy.has(v.id) ? 0.5 : 1 }"
              :disabled="wishlistBusy.has(v.id)"
              @click="addToWishlist(v, model)"
            >{{ wishlistBusy.has(v.id) ? 'Adding…' : '+ Wishlist' }}</button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!loadingModels && models.length === 0" style="font-style: italic; color: var(--muted);">No reference models yet — run the scraper.</p>
    <p v-if="!loadingModels && models.length > 0 && modelsForActiveTab.length === 0" style="font-style: italic; color: var(--muted);">No {{ activeGeneration === 'All' ? '' : (activeGeneration === '—' ? 'unknown-generation ' : activeGeneration + ' ') }}models for {{ activeManufacturer }}.</p>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel, DiecastVariant } from '~/composables/useDiecastReference'
import { deriveGeneration, compareByGeneration, GEN_ORDER, type Generation } from '~/utils/catalog'

const { fetchModels, fetchVariants, fetchVariantModelIds } = useDiecastReference()
const { items: collectionItems, fetchAll: fetchCollectionItems } = useItems()
const { items: wishlistItemsList, fetchAll: fetchWishlistItems, create: createWishlistItem } = useWishlist()
const { importFromUrl } = useImageUpload()

const models = ref<DiecastModel[]>([])
const loadingModels = ref(false)
const variantsByModel = ref<Record<string, DiecastVariant[]>>({})
const fetchedModelIds = new Set<string>()
const wishlistBusy = ref<Set<string>>(new Set())

loadingModels.value = true
try {
  models.value = await fetchModels()
} catch (err) {
  console.warn('Failed to load diecast reference models:', err)
} finally {
  loadingModels.value = false
}

try {
  if (!collectionItems.value.length) await fetchCollectionItems()
} catch (err) {
  console.warn('Failed to load collection items for dedup check:', err)
}
try {
  if (!wishlistItemsList.value.length) await fetchWishlistItems()
} catch (err) {
  console.warn('Failed to load wishlist items for dedup check:', err)
}

const addedLookup = computed(() => {
  const map = new Map<string, { type: 'collection' | 'wishlist'; id: string }>()
  for (const item of collectionItems.value) {
    if (item.sourceVariantId) map.set(item.sourceVariantId, { type: 'collection', id: item.id })
  }
  for (const item of wishlistItemsList.value) {
    if (item.sourceVariantId) map.set(item.sourceVariantId, { type: 'wishlist', id: item.id })
  }
  return map
})

// Resolves each added variant back to its model's manufacturer, so tabs can be sorted
// by how much of that brand is already in the collection/wishlist. Only fetches the
// (small) set of variants actually referenced by items, not the full ~5k variant table.
const addedVariantModelIds = ref<{ id: string; modelId: string }[]>([])
watch(addedLookup, async (lookup) => {
  const variantIds = [...lookup.keys()]
  if (!variantIds.length) {
    addedVariantModelIds.value = []
    return
  }
  try {
    addedVariantModelIds.value = await fetchVariantModelIds(variantIds)
  } catch (err) {
    console.warn('Failed to resolve manufacturers for added items:', err)
  }
}, { immediate: true })

const addedCountByManufacturer = computed(() => {
  const manufacturerByModelId = new Map(models.value.map((m) => [m.id, m.manufacturer]))
  const counts = new Map<string, number>()
  for (const { modelId } of addedVariantModelIds.value) {
    const manufacturer = manufacturerByModelId.get(modelId)
    if (!manufacturer) continue
    counts.set(manufacturer, (counts.get(manufacturer) ?? 0) + 1)
  }
  return counts
})

const manufacturers = computed(() => {
  const counts = addedCountByManufacturer.value
  return [...new Set(models.value.map((m) => m.manufacturer))].sort((a, b) => {
    if (a === 'Hot Wheels' || b === 'Hot Wheels') return a === 'Hot Wheels' ? -1 : 1
    const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return countDiff !== 0 ? countDiff : a.localeCompare(b)
  })
})
const activeManufacturer = ref<string>('')
watch(manufacturers, (list) => {
  if (!activeManufacturer.value && list.length) activeManufacturer.value = list[0]!
}, { immediate: true })

const generationByModelId = computed(() => {
  const map = new Map<string, { generation: Generation; year: number | null }>()
  for (const m of models.value) map.set(m.id, deriveGeneration(m.name))
  return map
})

const activeGeneration = ref<'All' | Generation>('All')
const availableGenerations = computed(() => {
  const present = new Set(models.value.map((m) => generationByModelId.value.get(m.id)!.generation))
  return GEN_ORDER.filter((g) => present.has(g))
})

const modelsForActiveTab = computed(() =>
  models.value
    .filter((m) => m.manufacturer === activeManufacturer.value)
    .filter((m) => activeGeneration.value === 'All' || generationByModelId.value.get(m.id)!.generation === activeGeneration.value)
    .sort((a, b) => compareByGeneration(
      { ...generationByModelId.value.get(a.id)!, name: a.name },
      { ...generationByModelId.value.get(b.id)!, name: b.name },
    )),
)

watch(modelsForActiveTab, async (modelsInTab) => {
  const toFetch = modelsInTab.filter((m) => !fetchedModelIds.has(m.id))
  for (const model of toFetch) {
    fetchedModelIds.add(model.id)
    try {
      variantsByModel.value[model.id] = await fetchVariants(model.id)
    } catch (err) {
      console.warn(`Failed to load variants for ${model.name}:`, err)
    }
  }
}, { immediate: true })

async function addToWishlist(variant: DiecastVariant, model: DiecastModel) {
  if (wishlistBusy.value.has(variant.id)) return
  wishlistBusy.value = new Set(wishlistBusy.value).add(variant.id)
  try {
    const imported = await importFromUrl(variant.imageUrl)
    await createWishlistItem({
      title: model.name,
      estimatedPrice: 0,
      sourceUrl: model.sourceUrl,
      notes: variant.caption ?? '',
      imgKey: imported.key,
      sourceVariantId: variant.id,
    })
  } catch (err) {
    console.warn('Failed to add reference picture to wishlist:', err)
  } finally {
    const next = new Set(wishlistBusy.value)
    next.delete(variant.id)
    wishlistBusy.value = next
  }
}
</script>
