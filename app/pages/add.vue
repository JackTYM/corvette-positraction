<template>
  <div class="wrap" style="padding: 34px 26px 70px; max-width: 920px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Three</div>
    <h2 style="font-size: clamp(34px, 6vw, 60px); line-height: 0.9; margin-bottom: 6px;">Index a New Find</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px;">Fill out the card the way you'd file it in the steel drawer.</p>

    <div class="index-card">
      <div class="index-card-head">
        <span class="kicker" style="letter-spacing: 0.2em; font-size: 12px;">Collector's Index Card</span>
      </div>
      <div class="index-card-body">
        <div class="index-card-photo-row">
          <div class="index-card-photo">
            <img v-if="previewUrl" :src="previewUrl" alt="" class="index-card-photo-img" />
            <div v-else class="index-card-photo-empty">No photo yet</div>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: center; gap: 8px;">
            <span class="kicker" style="color: var(--muted); font-size: 10px;">Photo of the find</span>
            <label class="btn ghost" style="cursor: pointer; border-color: var(--ink);">
              {{ previewUrl ? 'Replace photo' : 'Upload a photo' }}
              <input type="file" accept="image/*" style="display: none;" @change="onFile" />
            </label>
            <button v-if="previewUrl" class="link-tab" style="color: var(--muted); font-size: 12px; text-align: left; background: none; border: none;" @click="clearPhoto">Remove</button>
            <span v-if="uploading" class="kicker" style="color: var(--orange); font-size: 10px;">Uploading…</span>
          </div>
        </div>

        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Item Title *</span>
          <input v-model="form.title" placeholder="e.g. Sting Ray Split-Window Coupe" style="border-bottom: 2px solid var(--ink); padding: 5px 2px; font-family: var(--font-display); font-weight: 700; font-size: 27px;" />
        </label>

        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Subtitle / Descriptor</span>
          <input v-model="form.sub" placeholder="e.g. Riverside Red · the one-year-only window" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-style: italic; font-size: 17px;" />
        </label>

        <div class="index-card-grid">
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Category</span>
            <select v-model="form.category" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em;">
              <option v-for="c in categoryKeys" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label v-if="fieldSet.gen">
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Generation</span>
            <select v-model="form.generation" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-family: var(--font-cond);">
              <option v-for="g in genOptions" :key="g" :value="g">{{ g === '—' ? '— (none)' : `${g} · ${GENERATIONS[g as Exclude<typeof g, '—'>].years}` }}</option>
            </select>
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ fieldSet.year.l }} *</span>
            <input v-model="form.year" type="number" :placeholder="fieldSet.year.ph" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ fieldSet.scale.l }}</span>
            <input v-model="form.scale" :placeholder="fieldSet.scale.ph" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ fieldSet.maker.l }}</span>
            <input v-model="form.maker" :placeholder="fieldSet.maker.ph" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Stored At</span>
            <input v-model="form.location" placeholder="Cabinet A · Shelf 2" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Acquired</span>
            <input v-model="form.acquired" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Price Paid ($)</span>
            <input v-model="form.pricePaid" type="number" placeholder="95" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Est. Value ($)</span>
            <input v-model="form.value" type="number" placeholder="285" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
        </div>

        <label style="display: block; margin-bottom: 18px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Condition Report</span>
          <input v-model="form.condition" placeholder="Mint · opening doors, hood & decklid" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-style: italic;" />
        </label>

        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Provenance & Notes</span>
          <textarea v-model="form.story" rows="3" placeholder="Where it came from, why it matters, what you won't touch…" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 16.5px; line-height: 1.5; resize: vertical;" />
        </label>
      </div>
    </div>

    <div class="no-print" style="display: flex; gap: 12px; margin-top: 22px; justify-content: flex-end;">
      <NuxtLink to="/" class="btn ghost">Discard</NuxtLink>
      <button class="btn primary" :disabled="!valid || saving" :style="{ opacity: valid && !saving ? 1 : 0.45, pointerEvents: valid && !saving ? 'auto' : 'none' }" @click="onSave">
        {{ saving ? 'Filing…' : '✓ File This Card' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FIELD_SETS, CATEGORIES, GENERATIONS, GEN_ORDER, type Category, type Generation } from '~/utils/catalog'

const { create } = useItems()
const { upload } = useImageUpload()

const categoryKeys = Object.keys(CATEGORIES) as Category[]
const genOptions = GEN_ORDER

const form = reactive({
  title: '', sub: '', category: 'DIECAST' as Category, generation: 'C2' as Generation,
  year: '', scale: '', maker: '', acquired: '', pricePaid: '', value: '',
  condition: '', location: '', story: '',
})
const fieldSet = computed(() => FIELD_SETS[form.category])

watch(() => form.category, (c) => {
  const fs = FIELD_SETS[c]
  if (!fs.gen) form.generation = '—'
  else if (form.generation === '—') form.generation = 'C2'
})

const pendingFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
let uploadedKey: string | null = null

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}
function clearPhoto() {
  pendingFile.value = null
  previewUrl.value = null
  uploadedKey = null
}

const valid = computed(() => form.title.trim().length > 0 && String(form.year).trim().length > 0)
const saving = ref(false)

async function onSave() {
  if (!valid.value || saving.value) return
  saving.value = true
  try {
    if (pendingFile.value) {
      uploading.value = true
      const result = await upload(pendingFile.value)
      uploadedKey = result.key
    }
    const item = await create({
      title: form.title, sub: form.sub || 'Newly catalogued', category: form.category,
      generation: form.generation, year: form.year ? Number(form.year) : '',
      scale: form.scale || '—', maker: form.maker || 'Unknown', acquired: form.acquired,
      pricePaid: Number(form.pricePaid) || 0, value: Number(form.value) || 0,
      condition: form.condition || 'Not yet assessed', location: form.location || 'Unfiled',
      story: form.story || 'No notes recorded yet.', featured: false,
      colorName: '', colorHex: '', imgKey: uploadedKey,
    })
    await navigateTo(`/collection/${item.id}`)
  } finally {
    uploading.value = false
    saving.value = false
  }
}
</script>
