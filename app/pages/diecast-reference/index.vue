<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Reference</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">Diecast Reference</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px; max-width: 640px;">
      A catalog of known diecast Corvette releases, sourced from <a href="https://smalldiecastcorvettes.com" target="_blank" rel="noopener">smalldiecastcorvettes.com</a>. Currently Hot Wheels only.
    </p>

    <div v-for="(models, manufacturer) in grouped" :key="manufacturer" style="margin-bottom: 32px;">
      <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">{{ manufacturer }}</div>
      <div class="mag-grid">
        <NuxtLink v-for="m in models" :key="m.id" :to="`/diecast-reference/${m.id}`" class="editorial-card" style="text-decoration: none; color: inherit;">
          <div class="editorial-card-photo photo-frame">
            <img v-if="m.coverImageUrl" :src="m.coverImageUrl" :alt="m.name" class="editorial-card-img" />
            <div v-else class="editorial-card-placeholder">No photo yet</div>
          </div>
          <div style="padding: 10px 12px;">
            <div style="font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.1;">{{ m.name }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>
    <p v-if="models.length === 0" style="font-style: italic; color: var(--muted);">No reference models yet — run the scraper.</p>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel } from '~/composables/useDiecastReference'

const { fetchModels } = useDiecastReference()
const models = ref<DiecastModel[]>([])
try {
  models.value = await fetchModels()
} catch (err) {
  console.warn('Failed to load diecast reference models:', err)
}

const grouped = computed(() => {
  const out: Record<string, DiecastModel[]> = {}
  for (const m of models.value) {
    if (!out[m.manufacturer]) out[m.manufacturer] = []
    out[m.manufacturer]!.push(m)
  }
  return out
})
</script>
