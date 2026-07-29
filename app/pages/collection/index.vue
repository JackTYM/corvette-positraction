<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Two</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">The Collection</h2>

    <div class="no-print collection-filters">
      <span class="kicker" style="color: var(--muted); font-size: 10px; margin-right: 4px;">Filed under</span>
      <button
        v-for="c in cats" :key="c" class="link-tab filter-tab" :class="{ active: filter === c }"
        @click="filter = c"
      >{{ c }}{{ c === 'ALL' ? ` (${items.length})` : ` (${countFor(c)})` }}</button>
    </div>

    <div v-if="filter !== 'ALL'" class="no-print index-card" style="margin-bottom: 28px;">
      <div class="index-card-head" style="display: flex; align-items: center; justify-content: space-between;">
        <span class="kicker" style="letter-spacing: 0.2em; font-size: 12px;">Detailed Filters &middot; {{ filter }}</span>
        <button class="link-tab" style="color: var(--paper); font-size: 11px; letter-spacing: 0.14em; background: none; border: none;" @click="clearFilters">Clear</button>
      </div>
      <div class="index-card-body">
        <div class="index-card-grid">
          <label v-if="CATEGORY_HAS_GENERATION[filter]">
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Generation</span>
            <select v-model="topLevel.generation" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px; font-family: var(--font-cond);">
              <option value="">Any</option>
              <option v-for="g in GEN_ORDER" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Maker</span>
            <input v-model="topLevel.maker" placeholder="AUTOart" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Condition</span>
            <input v-model="topLevel.condition" placeholder="Mint" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Rarity (min)</span>
            <RarityStars v-model="topLevel.rarityMin" editable style="display: block; padding: 8px 2px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Value ($)</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input v-model="topLevel.valueMin" type="number" placeholder="min" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
              <span style="color: var(--muted);">&ndash;</span>
              <input v-model="topLevel.valueMax" type="number" placeholder="max" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
            </div>
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Acquired</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input v-model="topLevel.acquiredFrom" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
              <span style="color: var(--muted);">&ndash;</span>
              <input v-model="topLevel.acquiredTo" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
            </div>
          </label>

          <label v-for="f in visibleFilterFields" :key="f.key" :style="f.type === 'textarea' ? 'grid-column: 1 / -1;' : ''">
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ f.label }}</span>
            <input v-if="f.type === 'text'" v-model="(attributeFilters[f.key] as string)" type="text" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
            <textarea v-else-if="f.type === 'textarea'" v-model="(attributeFilters[f.key] as string)" rows="2" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 15px; resize: vertical;" />
            <select v-else-if="f.type === 'select'" v-model="(attributeFilters[f.key] as string)" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;">
              <option value="">Any</option>
              <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <select v-else-if="f.type === 'checkbox'" v-model="(attributeFilters[f.key] as string)" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;">
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <div v-else-if="f.type === 'number'" style="display: flex; align-items: center; gap: 8px;">
              <input v-model="(attributeFilters[f.key] as NumberRangeFilter).min" type="number" placeholder="min" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
              <span style="color: var(--muted);">&ndash;</span>
              <input v-model="(attributeFilters[f.key] as NumberRangeFilter).max" type="number" placeholder="max" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
            </div>
            <div v-else-if="f.type === 'date'" style="display: flex; align-items: center; gap: 8px;">
              <input v-model="(attributeFilters[f.key] as DateRangeFilter).from" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
              <span style="color: var(--muted);">&ndash;</span>
              <input v-model="(attributeFilters[f.key] as DateRangeFilter).to" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;" />
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="mag-grid">
      <EditorialCard v-for="it in shown" :key="it.id" :item="it" @open="openItem" />
    </div>
    <div v-if="shown.length === 0" class="collection-empty">
      <p style="font-style: italic; font-size: 17px; margin: 0;">Nothing filed under "{{ filter }}" yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Item, Category, FieldDef, NumberRangeFilter, DateRangeFilter, AttributeFilterValue } from '~/utils/catalog'
import { CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, GEN_ORDER, freshAttributeFilters, matchesAttributeFilters, matchesTopLevelFilters, emptyTopLevelFilters } from '~/utils/catalog'

const { items, fetchAll } = useItems()
try {
  await fetchAll()
} catch (err) {
  console.warn('Failed to load items for the Collection page:', err)
}

const filter = ref<'ALL' | Category>('ALL')
const cats = computed(() => ['ALL', ...new Set(items.value.map((i) => i.category))] as ('ALL' | Category)[])
const categoryFields = computed<FieldDef[]>(() => (filter.value === 'ALL' ? [] : CATEGORY_FIELDS[filter.value]))

const attributeFilters = ref<Record<string, AttributeFilterValue>>(freshAttributeFilters(categoryFields.value))
const topLevel = ref(emptyTopLevelFilters())

function isFilterFieldVisible(f: FieldDef): boolean {
  return !f.showWhen || attributeFilters.value[f.showWhen.key] === f.showWhen.equals
}
const visibleFilterFields = computed(() => categoryFields.value.filter(isFilterFieldVisible))

// Category is opt-in: switching it must fully reset any attribute/top-level filters
// from the previous category rather than leaking them into the new field set.
watch(filter, () => {
  attributeFilters.value = freshAttributeFilters(categoryFields.value)
  topLevel.value = emptyTopLevelFilters()
})

function clearFilters() {
  attributeFilters.value = freshAttributeFilters(categoryFields.value)
  topLevel.value = emptyTopLevelFilters()
}

const shown = computed(() => items.value.filter((i) => {
  if (filter.value === 'ALL') return true
  if (i.category !== filter.value) return false
  if (!matchesTopLevelFilters(i, topLevel.value)) return false
  return matchesAttributeFilters(i, categoryFields.value, attributeFilters.value)
}))

function countFor(c: Category) { return items.value.filter((i) => i.category === c).length }
function openItem(item: Item) { navigateTo(`/collection/${item.id}`) }
</script>
