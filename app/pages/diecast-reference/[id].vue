<template>
  <div v-if="model" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink to="/diecast-reference" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to Reference</NuxtLink>

    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">{{ model.manufacturer }}</div>
    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ model.name }}</h2>

    <div class="mag-grid">
      <div v-for="v in variants" :key="v.id" class="editorial-card">
        <div class="editorial-card-photo photo-frame">
          <img :src="v.imageUrl" :alt="v.caption || model.name" class="editorial-card-img" />
        </div>
        <div v-if="v.caption" style="padding: 10px 12px; font-size: 14px; line-height: 1.4;">{{ v.caption }}</div>
      </div>
    </div>
    <p v-if="variants.length === 0" style="font-style: italic; color: var(--muted); margin-top: 16px;">No known variants for this model yet.</p>

    <a :href="model.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="margin-top: 24px; display: inline-flex;">View on smalldiecastcorvettes.com →</a>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That reference model doesn't exist.</p>
    <NuxtLink to="/diecast-reference" class="btn" style="margin-top: 16px;">← Back to Reference</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel, DiecastVariant } from '~/composables/useDiecastReference'

const route = useRoute()
const { fetchModel, fetchVariants } = useDiecastReference()

const model = ref<DiecastModel | null>(null)
const variants = ref<DiecastVariant[]>([])
try {
  model.value = await fetchModel(route.params.id as string)
  if (model.value) variants.value = await fetchVariants(model.value.id)
} catch (err) {
  console.warn('Failed to load diecast reference model:', err)
}
</script>
