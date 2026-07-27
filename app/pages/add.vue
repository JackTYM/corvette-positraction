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
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
            Condition
            <InfoTooltip v-if="form.category === 'DIECAST'">
              <div style="font-weight: 700; margin-bottom: 8px;">Grade Scale</div>
              <p v-for="g in DIECAST_GRADE_SCALE" :key="g.value" style="margin: 0 0 8px;">
                <strong>{{ gradeLabel(g) }}:</strong> {{ g.description }}
              </p>
              <p style="margin: 10px 0 0; font-style: italic; color: var(--muted); font-size: 11.5px;">*{{ DIECAST_GRADE_SCALE_ATTRIBUTION }}</p>
            </InfoTooltip>
          </span>
          <select v-if="form.category === 'DIECAST'" v-model="form.condition" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;">
            <option value="">Select a grade…</option>
            <option v-for="g in DIECAST_GRADE_SCALE" :key="g.value" :value="gradeLabel(g)">{{ gradeLabel(g) }}</option>
          </select>
          <input v-else v-model="form.condition" placeholder="Mint · opening doors, hood & decklid" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-style: italic;" />
        </label>

        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Notes</span>
          <textarea v-model="form.story" rows="3" placeholder="Where it came from, why it matters, what you won't touch…" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 16.5px; line-height: 1.5; resize: vertical;" />
        </label>

        <div v-if="CATEGORY_HAS_GENERATION[form.category] || CAR_CATEGORIES.includes(form.category) || fields.length" style="margin-top: 20px;">
          <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">{{ form.category }} Details</div>
          <div class="index-card-grid">
            <label v-if="CATEGORY_HAS_GENERATION[form.category]">
              <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Generation</span>
              <select v-model="form.generation" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px; font-family: var(--font-cond);">
                <option v-for="g in genOptions" :key="g" :value="g">{{ g === '—' ? '— (none)' : `${g} · ${GENERATIONS[g as Exclude<typeof g, '—'>].years}` }}</option>
              </select>
            </label>
            <label v-if="CAR_CATEGORIES.includes(form.category)">
              <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Scale / Format</span>
              <input v-model="form.scale" placeholder="1:18" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
            </label>
            <label v-if="CAR_CATEGORIES.includes(form.category)">
              <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Maker / Manufacturer</span>
              <input v-model="form.maker" placeholder="AUTOart" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
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

    <div class="no-print" style="display: flex; gap: 12px; margin-top: 22px; justify-content: flex-end;">
      <NuxtLink to="/" class="btn ghost">Discard</NuxtLink>
      <button class="btn primary" :disabled="!valid || saving" :style="{ opacity: valid && !saving ? 1 : 0.45, pointerEvents: valid && !saving ? 'auto' : 'none' }" @click="onSave">
        {{ saving ? 'Filing…' : '✓ File This Card' }}
      </button>
    </div>

    <SlotPicker v-if="showLinkPicker" title="Link an Entry" empty-message="No other items to link yet." :candidates="linkCandidates" @close="showLinkPicker = false" @pick="addPendingLink" />
  </div>
</template>

<script setup lang="ts">
import { CATEGORIES, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, CAR_CATEGORIES, GENERATIONS, GEN_ORDER, DIECAST_GRADE_SCALE, DIECAST_GRADE_SCALE_ATTRIBUTION, gradeLabel, extractYearFromName, type Category, type Generation, type FieldDef } from '~/utils/catalog'

const { items, create } = useItems()
const { upload } = useImageUpload()
const { upload: uploadDoc } = useDocumentUpload()
const { create: createDocument } = useItemDocuments()
const { create: createLink } = useItemLinks()

const categoryKeys = Object.keys(CATEGORIES) as Category[]
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
  title: '', sub: '', category: 'DIECAST' as Category, generation: 'C2' as Generation,
  year: '', scale: '', maker: '', acquired: '', pricePaid: '', value: '',
  valueAsOf: '', valueSource: '', productionDate: '', rarity: null as number | null,
  condition: '', location: '', story: '',
  attributes: freshAttributes('DIECAST'),
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
let uploadedKey: string | null = null

const route = useRoute()
const { fetchVariant, fetchModel } = useDiecastReference()
const { importFromUrl } = useImageUpload()
const sourceVariantId = ref<string | null>(null)

const fromVariantId = route.query.fromVariant
if (typeof fromVariantId === 'string') {
  try {
    const variant = await fetchVariant(fromVariantId)
    if (variant) {
      sourceVariantId.value = variant.id
      previewUrl.value = variant.imageUrl
      const model = await fetchModel(variant.modelId)
      if (model) {
        if (!form.title.trim()) form.title = model.name
        if (!form.maker.trim()) form.maker = model.manufacturer
        const year = extractYearFromName(model.name)
        if (year && !String(form.year).trim()) form.year = String(year)
        const referenceLine = `Reference: ${model.sourceUrl}`
        form.story = form.story.trim() ? `${form.story}\n${referenceLine}` : referenceLine
      }
      // Fire-and-forget: don't block page render on the R2 import round-trip. The user
      // already sees the live reference photo via previewUrl above; this swaps in the
      // imported copy once it lands, without holding up setup().
      importFromUrl(variant.imageUrl)
        .then((imported) => {
          uploadedKey = imported.key
          previewUrl.value = imported.url
        })
        .catch((err) => {
          console.warn('Failed to import reference photo into R2:', err)
        })
    }
  } catch (err) {
    console.warn('Failed to load reference variant for prefill:', err)
  }
}

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
      valueAsOf: form.valueAsOf, valueSource: form.valueSource, productionDate: form.productionDate,
      rarity: form.rarity,
      condition: form.condition || 'Not yet assessed', location: form.location || 'Unfiled',
      story: form.story || 'No notes recorded yet.', featured: false,
      colorName: '', colorHex: '', imgKey: uploadedKey, sourceVariantId: sourceVariantId.value, attributes: coerceAttributesForSave(fields.value, form.attributes),
    })
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
    await navigateTo(`/collection/${item.id}`)
  } finally {
    uploading.value = false
    saving.value = false
  }
}
</script>
