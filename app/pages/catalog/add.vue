<template>
  <div class="wrap" style="padding: 34px 26px 70px; max-width: 920px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">The Catalog</div>
    <h2 style="font-size: clamp(34px, 6vw, 60px); line-height: 0.9; margin-bottom: 6px;">{{ editingItemId ? 'Edit This Card' : 'Catalog a New Find' }}</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px;">{{ editingItemId ? 'Update the card on file.' : "Fill out the card the way you'd file it in the steel drawer." }}</p>

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
            <button v-if="canRecrop" class="link-tab" style="color: var(--muted); font-size: 12px; text-align: left; background: none; border: none;" @click="openRecrop">Adjust crop</button>
            <button v-if="previewUrl" class="link-tab" style="color: var(--muted); font-size: 12px; text-align: left; background: none; border: none;" @click="clearPhoto">Remove</button>
            <span v-if="uploading" class="kicker" style="color: var(--orange); font-size: 10px;">Uploading…</span>
          </div>
        </div>

        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Item Title *</span>
          <input v-model="form.title" placeholder="e.g. Original Chevrolet Brochure Collection" style="border-bottom: 2px solid var(--ink); padding: 5px 2px; font-family: var(--font-display); font-weight: 700; font-size: 27px;" />
        </label>

        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Subtitle / Descriptor</span>
          <input v-model="form.sub" placeholder="e.g. Set of 12, 1963–1967" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-style: italic; font-size: 17px;" />
        </label>

        <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">General</div>
        <div class="index-card-grid">
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Category</span>
            <select v-model="form.category" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em;">
              <option v-for="c in categoryKeys" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Year *</span>
            <input v-model="form.year" type="number" placeholder="1963" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
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
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Value As Of</span>
            <input v-model="form.valueAsOf" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Value Source</span>
            <input v-model="form.valueSource" placeholder="Hagerty valuation, eBay comp…" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Production Date</span>
            <input v-model="form.productionDate" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
          </label>
          <label>
            <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Rarity</span>
            <RarityStars v-model="form.rarity" editable style="display: block; padding: 8px 2px;" />
          </label>
        </div>

        <label style="display: block; margin-bottom: 18px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Condition</span>
          <input v-model="form.condition" placeholder="Mint · complete set, no tears" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-style: italic;" />
        </label>

        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Notes</span>
          <textarea v-model="form.story" rows="3" placeholder="Where it came from, why it matters, what you won't touch…" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 16.5px; line-height: 1.5; resize: vertical;" />
        </label>

        <div v-if="CATEGORY_HAS_GENERATION[form.category] || fields.length" style="margin-top: 20px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">{{ form.category }} Details</div>
          <div class="index-card-grid">
            <label v-if="CATEGORY_HAS_GENERATION[form.category]">
              <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Generation</span>
              <select v-model="form.generation" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-family: var(--font-cond);">
                <option v-for="g in genOptions" :key="g" :value="g">{{ g === '—' ? '— (none)' : `${g} · ${GENERATIONS[g as Exclude<typeof g, '—'>].years}` }}</option>
              </select>
            </label>
            <label v-for="f in visibleFields" :key="f.key" :style="f.type === 'textarea' ? 'grid-column: 1 / -1;' : ''">
              <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ f.label }}</span>
              <input v-if="f.type === 'text' || f.type === 'number' || f.type === 'date'" v-model="form.attributes[f.key]" :type="f.type" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
              <textarea v-else-if="f.type === 'textarea'" v-model="form.attributes[f.key]" rows="2" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 16.5px; resize: vertical;" />
              <select v-else-if="f.type === 'select'" v-model="form.attributes[f.key]" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;">
                <option value="">—</option>
                <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <span v-else-if="f.type === 'checkbox'" style="display: flex; align-items: center; gap: 6px; padding: 5px 2px;">
                <input v-model="form.attributes[f.key]" type="checkbox" />
              </span>
            </label>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">Documents</div>
          <label class="btn ghost no-print" style="cursor: pointer; border-color: var(--ink);">
            + Attach a Document
            <input type="file" accept=".pdf,image/*" multiple style="display: none;" @change="onDocFiles" />
          </label>
          <div v-for="(d, i) in pendingDocuments" :key="`${d.name}-${i}`" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>{{ d.name }}</span>
            <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="removePendingDocument(i)">remove</button>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">Linked Entries</div>
          <button class="btn ghost no-print" type="button" style="border-color: var(--ink);" @click="showLinkPicker = true">+ Link an Entry</button>
          <div v-for="id in pendingLinks" :key="id" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>{{ items.find((i) => i.id === id)?.title }}</span>
            <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="removePendingLink(id)">remove</button>
          </div>
        </div>
      </div>
    </div>

    <div class="no-print" style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-top: 22px;">
      <p v-if="!saving && blockReasons.length" style="color: var(--orange); font-size: 12.5px; font-style: italic; margin: 0;">{{ blockReasons.join(' ') }}</p>
      <div style="display: flex; gap: 12px;">
        <NuxtLink to="/catalog" class="btn ghost">Discard</NuxtLink>
        <button class="btn primary" :disabled="!valid || saving" :style="{ opacity: valid && !saving ? 1 : 0.45, pointerEvents: valid && !saving ? 'auto' : 'none' }" @click="onSave">
          {{ saving ? 'Filing…' : editingItemId ? '✓ Save Changes' : '✓ File This Card' }}
        </button>
      </div>
    </div>

    <SlotPicker v-if="showLinkPicker" title="Link an Entry" empty-message="No other items to link yet." :candidates="linkCandidates" @close="showLinkPicker = false" @pick="addPendingLink" />
    <ImageCropModal v-if="showCropModal && cropSrc" :src="cropSrc" @close="showCropModal = false" @confirm="onCropConfirm" />
  </div>
</template>

<script setup lang="ts">
import { CATEGORIES, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, CAR_CATEGORIES, GENERATIONS, GEN_ORDER, type Category, type Generation, type FieldDef, type Item } from '~/utils/catalog'

// Same reasoning as add.vue: re-run setup on every route.fullPath change so ?edit=<id>
// re-initializes the form when navigating between two different catalog items to edit.
definePageMeta({ key: (route) => route.fullPath })

const { items, fetchAll: fetchAllItems, create, update } = useItems()
const { upload } = useImageUpload()
const { upload: uploadDoc } = useDocumentUpload()
const { create: createDocument } = useItemDocuments()
const { create: createLink } = useItemLinks()
const cfg = useRuntimeConfig()

const categoryKeys = (Object.keys(CATEGORIES) as Category[]).filter((c) => !CAR_CATEGORIES.includes(c))
const genOptions = GEN_ORDER

function freshAttributes(c: Category): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const f of CATEGORY_FIELDS[c]) next[f.key] = f.type === 'checkbox' ? false : ''
  return next
}

function isFieldVisible(f: FieldDef, attrs: Record<string, unknown>): boolean {
  return !f.showWhen || attrs[f.showWhen.key] === f.showWhen.equals
}

function coerceAttributesForSave(defs: FieldDef[], attrs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...attrs }
  for (const f of defs) {
    if (!isFieldVisible(f, out)) {
      out[f.key] = f.type === 'checkbox' ? false : ''
      continue
    }
    if (f.type === 'number' && out[f.key] !== '' && out[f.key] != null) out[f.key] = Number(out[f.key])
  }
  return out
}

const form = reactive({
  title: '', sub: '', category: 'BROCHURE' as Category, generation: 'C2' as Generation,
  year: '', acquired: '', pricePaid: '', value: '',
  valueAsOf: '', valueSource: '', productionDate: '', rarity: null as number | null,
  condition: '', location: '', story: '',
  attributes: freshAttributes('BROCHURE'),
})
const fields = computed(() => CATEGORY_FIELDS[form.category])
const visibleFields = computed(() => fields.value.filter((f) => isFieldVisible(f, form.attributes)))

watch(() => form.category, (c) => {
  if (!CATEGORY_HAS_GENERATION[c]) form.generation = '—'
  else if (form.generation === '—') form.generation = 'C2'
  form.attributes = freshAttributes(c)
})

const pendingFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const uploadedKey = ref<string | null>(null)

const route = useRoute()

const editingItemId = ref<string | null>(null)
const editQuery = route.query.edit
if (typeof editQuery === 'string') {
  try {
    if (!items.value.length) await fetchAllItems()
    const existing = items.value.find((i) => i.id === editQuery)
    if (existing) {
      editingItemId.value = existing.id
      form.title = existing.title
      form.sub = existing.sub
      form.category = existing.category
      // form.category's watcher resets generation/attributes to category defaults --
      // wait for that to flush, then overwrite with the item's real saved values so
      // editing doesn't silently blank out its category-specific fields.
      await nextTick()
      form.generation = existing.generation
      form.year = String(existing.year)
      form.acquired = existing.acquired
      form.pricePaid = String(existing.pricePaid)
      form.value = String(existing.value)
      form.valueAsOf = existing.valueAsOf
      form.valueSource = existing.valueSource
      form.productionDate = existing.productionDate
      form.rarity = existing.rarity
      form.condition = existing.condition
      form.location = existing.location
      form.story = existing.story
      form.attributes = { ...freshAttributes(existing.category), ...existing.attributes }
      if (existing.imgKey) {
        uploadedKey.value = existing.imgKey
        previewUrl.value = `${cfg.public.imageBaseUrl}/${existing.imgKey}`
      }
    }
  } catch (err) {
    console.warn('Failed to load item for editing:', err)
  }
}

// Crop step: identical to add.vue's -- a freshly-picked file goes through ImageCropModal
// before becoming pendingFile/previewUrl, and re-cropping an already-uploaded photo (edit
// mode) is re-fetched same-origin through /api/image-proxy (the R2 host sends no CORS
// headers, so a direct cross-origin <img> load can't be read back out of a canvas).
const cropSrc = ref<string | null>(null)
const showCropModal = ref(false)
let cropObjectUrl: string | null = null
const canRecrop = computed(() => !!previewUrl.value && (!!cropObjectUrl || !!uploadedKey.value))

function revokeIfBlob(url: string | null) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}
onBeforeUnmount(() => {
  revokeIfBlob(cropObjectUrl)
  revokeIfBlob(previewUrl.value)
})

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  revokeIfBlob(cropObjectUrl)
  cropObjectUrl = URL.createObjectURL(file)
  cropSrc.value = cropObjectUrl
  showCropModal.value = true
  input.value = ''
}
function openRecrop() {
  if (cropObjectUrl) cropSrc.value = cropObjectUrl
  else if (uploadedKey.value) cropSrc.value = `/api/image-proxy?key=${encodeURIComponent(uploadedKey.value)}`
  else return
  showCropModal.value = true
}
function onCropConfirm(blob: Blob) {
  revokeIfBlob(previewUrl.value)
  const cropped = new File([blob], 'cropped.png', { type: blob.type || 'image/png' })
  pendingFile.value = cropped
  previewUrl.value = URL.createObjectURL(cropped)
  showCropModal.value = false
}
function clearPhoto() {
  revokeIfBlob(previewUrl.value)
  revokeIfBlob(cropObjectUrl)
  cropObjectUrl = null
  pendingFile.value = null
  previewUrl.value = null
  uploadedKey.value = null
}

const pendingDocuments = ref<File[]>([])
function onDocFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  pendingDocuments.value.push(...files)
}
function removePendingDocument(i: number) {
  pendingDocuments.value.splice(i, 1)
}

const pendingLinks = ref<string[]>([])
const showLinkPicker = ref(false)
const linkCandidates = computed(() => items.value.filter((i) => !pendingLinks.value.includes(i.id)))
function addPendingLink(id: string) {
  pendingLinks.value.push(id)
  showLinkPicker.value = false
}
function removePendingLink(id: string) {
  pendingLinks.value = pendingLinks.value.filter((x) => x !== id)
}

const valid = computed(() => form.title.trim().length > 0 && String(form.year).trim().length > 0)
const blockReasons = computed(() => {
  const reasons: string[] = []
  if (!form.title.trim()) reasons.push('Item Title is required.')
  if (!String(form.year).trim()) reasons.push('Year is required.')
  return reasons
})
const saving = ref(false)

async function onSave() {
  if (!valid.value || saving.value) return
  saving.value = true
  try {
    if (pendingFile.value) {
      uploading.value = true
      const result = await upload(pendingFile.value)
      uploadedKey.value = result.key
    }
    const payload: Partial<Item> = {
      title: form.title, sub: form.sub || 'Newly catalogued', category: form.category,
      generation: form.generation, year: form.year ? Number(form.year) : '',
      scale: '—', maker: 'Unknown', acquired: form.acquired,
      pricePaid: Number(form.pricePaid) || 0, value: Number(form.value) || 0,
      valueAsOf: form.valueAsOf, valueSource: form.valueSource, productionDate: form.productionDate,
      rarity: form.rarity,
      condition: form.condition || 'Not yet assessed', location: form.location || 'Unfiled',
      story: form.story || 'No notes recorded yet.',
      imgKey: uploadedKey.value, sourceVariantId: null, attributes: coerceAttributesForSave(fields.value, form.attributes),
    }
    if (!editingItemId.value) {
      payload.featured = false
      payload.colorName = ''
      payload.colorHex = ''
    }
    const item = editingItemId.value
      ? await update(editingItemId.value, payload)
      : await create(payload as Omit<Item, 'id'>)
    for (const file of pendingDocuments.value) {
      try {
        const uploaded = await uploadDoc(file)
        await createDocument(item.id, uploaded)
      } catch (err) {
        console.warn('Failed to attach document after item creation:', err)
      }
    }
    for (const linkedId of pendingLinks.value) {
      try {
        await createLink(item.id, linkedId)
      } catch (err) {
        console.warn('Failed to create linked entry after item creation:', err)
      }
    }
    await navigateTo(`/catalog/${item.id}`)
  } finally {
    uploading.value = false
    saving.value = false
  }
}
</script>
