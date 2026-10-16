<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink to="/wishlist" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to Wishlist</NuxtLink>
    <button v-if="!editing" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; margin-left: 16px; background: none; border: none;" @click="startEdit">Edit</button>
    <button class="link-tab no-print" style="color: var(--muted); margin-bottom: 20px; margin-left: 16px; background: none; border: none;" @click="confirmingDelete = true">Remove from Wishlist</button>

    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ item.title }}</h2>

    <div class="editorial-card-photo photo-frame" style="max-width: 420px; margin-bottom: 18px;">
      <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="editorial-card-img" />
      <div v-else class="editorial-card-placeholder">No photo yet</div>
    </div>

    <form v-if="editing" class="index-card no-print" style="max-width: 560px; margin-bottom: 18px;" @submit.prevent="onSave">
      <div class="index-card-head">
        <span class="kicker" style="letter-spacing: 0.2em; font-size: 12px;">Edit Wishlist Entry</span>
      </div>
      <div class="index-card-body" style="display: flex; flex-direction: column; gap: 14px;">
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Name *</span>
          <input v-model="form.title" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Collection</span>
          <select v-model="form.collection" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%; font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em;">
            <option v-for="c in COLLECTION_NAMES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Estimated Price ($)</span>
          <input v-model="form.estimatedPrice" type="number" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input v-model="form.isRare" type="checkbox" style="width: auto; flex-shrink: 0;" />
          <span>Rare / Treasure Hunt</span>
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Source Link</span>
          <input v-model="form.sourceUrl" placeholder="https://…" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Notes</span>
          <textarea v-model="form.notes" rows="3" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 15px; width: 100%;" />
        </label>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn ghost" @click="editing = false">Cancel</button>
          <button type="submit" class="btn primary" :disabled="!form.title.trim() || saving">{{ saving ? 'Saving…' : 'Save Changes' }}</button>
        </div>
      </div>
    </form>

    <template v-else>
      <p v-if="item.estimatedPrice > 0" style="font-size: 18px; margin: 0 0 10px;">Estimated: {{ fmtMoney(item.estimatedPrice) }}</p>
      <p v-if="item.isRare" class="kicker" style="color: var(--orange); margin: 0 0 10px;">★ Rare / Treasure Hunt</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
        <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="display: inline-flex;">View source →</a>
        <NuxtLink :to="`/add?fromWishlist=${item.id}`" class="btn primary no-print" style="display: inline-flex;">I Bought This — Index It</NuxtLink>
      </div>
      <p v-if="item.notes" style="font-style: italic; line-height: 1.5;">{{ item.notes }}</p>
    </template>

    <ConfirmModal
      v-if="confirmingDelete" title="Remove From Wishlist" confirm-label="Remove"
      :message="`Remove &quot;${item.title}&quot; from your wishlist? This can't be undone.`"
      @confirm="onDelete" @cancel="confirmingDelete = false"
    />
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That wishlist entry doesn't exist.</p>
    <NuxtLink to="/wishlist" class="btn" style="margin-top: 16px;">← Back to Wishlist</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney, COLLECTIONS, COLLECTION_NAMES, collectionOf, type Collection } from '~/utils/catalog'
import type { WishlistItem } from '~/composables/useWishlist'

const route = useRoute()
const { items, fetchAll, update, remove: removeWishlistItem } = useWishlist()
const { remove: removeImage } = useImageUpload()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load wishlist items:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)

const editing = ref(false)
const saving = ref(false)
const form = reactive({ title: '', collection: 'Diecast' as Collection, estimatedPrice: '', sourceUrl: '', notes: '', isRare: false })

function startEdit() {
  if (!item.value) return
  form.title = item.value.title
  form.collection = collectionOf(item.value.category)
  form.estimatedPrice = item.value.estimatedPrice > 0 ? String(item.value.estimatedPrice) : ''
  form.sourceUrl = item.value.sourceUrl
  form.notes = item.value.notes
  form.isRare = item.value.isRare
  editing.value = true
}

async function onSave() {
  if (!item.value || !form.title.trim() || saving.value) return
  saving.value = true
  try {
    const patch: Partial<WishlistItem> = {
      title: form.title.trim(), estimatedPrice: Number(form.estimatedPrice) || 0,
      sourceUrl: form.sourceUrl, notes: form.notes, isRare: form.isRare,
    }
    if (form.collection !== collectionOf(item.value.category)) patch.category = COLLECTIONS[form.collection][0]!
    await update(item.value.id, patch)
    editing.value = false
  } finally {
    saving.value = false
  }
}

const confirmingDelete = ref(false)
async function onDelete() {
  confirmingDelete.value = false
  if (!item.value) return
  const imgKey = item.value.imgKey
  await removeWishlistItem(item.value.id)
  if (imgKey) {
    try {
      await removeImage(imgKey)
    } catch (err) {
      console.warn('Failed to remove R2 image after wishlist delete:', err)
    }
  }
  await navigateTo('/wishlist')
}
</script>
