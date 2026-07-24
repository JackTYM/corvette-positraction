<template>
  <div class="wrap" style="padding: 60px 26px; max-width: 480px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Member Access</div>
    <h2 style="font-size: clamp(30px, 5vw, 44px); margin-bottom: 24px;">Welcome Back</h2>

    <form style="background: var(--paper); border: 2px solid var(--ink); box-shadow: var(--shadow);" @submit.prevent="onSubmit">
      <div style="background: var(--ink); color: var(--paper); padding: 10px 20px;">
        <span class="kicker" style="letter-spacing: 0.2em; font-size: 12px;">Collector Sign-In</span>
      </div>
      <div style="padding: 26px 28px 28px;">
        <label style="display: block; margin-bottom: 20px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Email</span>
          <input v-model="email" type="email" required placeholder="you@example.com" style="border-bottom: 2px solid var(--ink); padding: 5px 2px; font-size: 16.5px;" />
        </label>
        <label style="display: block; margin-bottom: 8px;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Password</span>
          <input v-model="password" type="password" required placeholder="Your password" style="border-bottom: 2px solid var(--ink); padding: 5px 2px; font-size: 16.5px;" />
        </label>
        <p v-if="error" style="color: var(--orange-deep); font-size: 13.5px; margin: 10px 0 0;">{{ error }}</p>
        <button type="submit" class="btn primary" :disabled="loading" style="width: 100%; justify-content: center; margin-top: 22px;">
          {{ loading ? 'Checking…' : 'Sign In →' }}
        </button>
      </div>
    </form>

    <div style="display: flex; align-items: center; gap: 12px; margin: 20px 0;">
      <span style="flex: 1; border-top: 1px solid var(--rule);" />
      <span class="kicker" style="color: var(--muted); font-size: 10px;">or</span>
      <span style="flex: 1; border-top: 1px solid var(--rule);" />
    </div>
    <button type="button" class="btn ghost" style="width: 100%; justify-content: center; border-color: var(--ink);" @click="onGoogle">
      Continue with Google
    </button>

    <p style="font-style: italic; color: var(--muted); font-size: 15px; margin-top: 18px;">
      New here?
      <NuxtLink to="/auth/sign-up" class="link-tab" style="color: var(--orange);">Create an account</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { signIn, signInWithGoogle } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  const { error: signInError } = await signIn(email.value, password.value)
  loading.value = false
  if (signInError) {
    error.value = 'Incorrect email or password.'
    return
  }
  await navigateTo('/')
}

async function onGoogle() {
  await signInWithGoogle()
}
</script>
