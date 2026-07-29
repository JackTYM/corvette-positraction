<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Add to Wishlist</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Photo</span>
          <div v-if="previewUrl" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <div class="index-card-photo" style="width: 96px; height: 68px;">
              <img :src="previewUrl" alt="" class="index-card-photo-img" />
            </div>
            <button type="button" class="link-tab" style="color: var(--muted); font-size: 12px; background: none; border: none;" @click="openRecrop">Adjust crop</button>
          </div>
          <input type="file" accept="image/*" @change="onFile" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Name *</span>
          <input v-model="title" placeholder="e.g. 1967 L88 Coupe" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Estimated Price ($)</span>
          <input v-model="estimatedPrice" type="number" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Source Link</span>
          <input v-model="sourceUrl" placeholder="https://…" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Notes</span>
          <textarea v-model="notes" rows="2" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 15px; width: 100%;" />
        </label>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn ghost" @click="$emit('close')">Cancel</button>
          <button class="btn primary" :disabled="!title.trim() || saving" @click="onSave">{{ saving ? 'Saving…' : 'Add' }}</button>
        </div>
      </div>
    </div>
    <ImageCropModal v-if="showCropModal && cropSrc" :src="cropSrc" @close="showCropModal = false" @confirm="onCropConfirm" />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: []; saved: [] }>()
const { upload } = useImageUpload()
const { create } = useWishlist()

const pendingFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const title = ref('')
const estimatedPrice = ref('')
const sourceUrl = ref('')
const notes = ref('')
const saving = ref(false)

// Same crop-before-upload flow as add.vue: the picked file goes through ImageCropModal
// before it ever becomes pendingFile, and the object URL is kept around so "Adjust crop"
// can re-open it against the original pick rather than the already-cropped result.
const cropSrc = ref<string | null>(null)
const showCropModal = ref(false)
let cropObjectUrl: string | null = null

function revokeIfBlob(url: string | null) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}
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
  if (!cropObjectUrl) return
  cropSrc.value = cropObjectUrl
  showCropModal.value = true
}
function onCropConfirm(blob: Blob) {
  revokeIfBlob(previewUrl.value)
  const cropped = new File([blob], 'cropped.png', { type: blob.type || 'image/png' })
  pendingFile.value = cropped
  previewUrl.value = URL.createObjectURL(cropped)
  showCropModal.value = false
}
onBeforeUnmount(() => {
  revokeIfBlob(cropObjectUrl)
  revokeIfBlob(previewUrl.value)
})

async function onSave() {
  if (!title.value.trim() || saving.value) return
  saving.value = true
  try {
    let imgKey: string | null = null
    if (pendingFile.value) {
      const result = await upload(pendingFile.value)
      imgKey = result.key
    }
    await create({
      title: title.value, estimatedPrice: Number(estimatedPrice.value) || 0,
      sourceUrl: sourceUrl.value, notes: notes.value, imgKey, sourceVariantId: null,
    })
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
