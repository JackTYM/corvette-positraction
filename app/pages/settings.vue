<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Account</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 24px;">Settings</h2>

    <div class="index-card" style="max-width: 560px;">
      <div class="index-card-head">
        <span class="kicker" style="letter-spacing: 0.2em; font-size: 12px;">Public Sharing</span>
      </div>
      <div class="index-card-body">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" :checked="shareEnabled" :disabled="saving" style="width: auto; flex-shrink: 0;" @change="onToggle" />
          <span>Share my collection publicly</span>
        </label>
        <p style="font-style: italic; color: var(--muted); font-size: 13.5px; margin: 10px 0 0;">
          When on, anyone with your link can view your Collection and Wishlist — including notes, condition, price paid, and estimated value. Your Garage and account are never shown.
        </p>

        <div v-if="shareEnabled" style="margin-top: 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <input :value="shareUrl" readonly style="flex: 1; min-width: 240px; border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 14px;" />
          <button class="btn ghost" style="font-size: 12px; padding: 7px 13px;" @click="onCopy">{{ copied ? 'Copied!' : 'Copy Link' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { shareEnabled, loaded, fetchSettings, setShareEnabled } = useShareSettings()
const saving = ref(false)
const copied = ref(false)

if (!loaded.value) {
  try {
    await fetchSettings()
  } catch (err) {
    console.warn('Failed to load share settings:', err)
  }
}

const shareUrl = computed(() => `https://share.corvettepositraction.com/${user.value?.id ?? ''}`)

async function onToggle(e: Event) {
  const next = (e.target as HTMLInputElement).checked
  saving.value = true
  try {
    await setShareEnabled(next)
  } catch (err) {
    console.warn('Failed to update share setting:', err)
    ;(e.target as HTMLInputElement).checked = !next
  } finally {
    saving.value = false
  }
}

async function onCopy() {
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>
