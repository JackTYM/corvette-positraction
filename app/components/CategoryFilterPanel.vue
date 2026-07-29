<template>
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
          <select v-model="topLevel.maker" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px; font-family: var(--font-cond);">
            <option value="">Any</option>
            <option v-for="opt in makerOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </label>
        <label>
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Condition</span>
          <select v-model="topLevel.condition" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px; font-family: var(--font-cond);">
            <option value="">Any</option>
            <option v-for="opt in conditionOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
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
          <select v-if="f.type === 'text'" v-model="(attributeFilters[f.key] as string)" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 15px;">
            <option value="">Any</option>
            <option v-for="opt in attributeOptions[f.key]" :key="opt" :value="opt">{{ opt }}</option>
          </select>
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
    <EditorialCard v-for="it in shown" :key="it.id" :item="it" @open="emit('open', it)" />
  </div>
  <div v-if="shown.length === 0" class="collection-empty">
    <p style="font-style: italic; font-size: 17px; margin: 0;">Nothing filed under "{{ filter }}" yet.</p>
  </div>
</template>

<script setup lang="ts">
import type { Item, NumberRangeFilter, DateRangeFilter } from '~/utils/catalog'
import { CATEGORY_HAS_GENERATION, GEN_ORDER } from '~/utils/catalog'

const props = defineProps<{ items: Item[] }>()
const emit = defineEmits<{ open: [item: Item] }>()

const {
  filter,
  cats,
  attributeFilters,
  topLevel,
  makerOptions,
  conditionOptions,
  attributeOptions,
  visibleFilterFields,
  clearFilters,
  shown,
  countFor,
} = useCategoryFilter(toRef(props, 'items'))
</script>
