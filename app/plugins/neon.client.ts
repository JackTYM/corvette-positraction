import { createClient } from '@neondatabase/neon-js'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()
  const neon = createClient({
    auth: { url: cfg.public.neonAuthUrl },
    dataApi: { url: cfg.public.neonDataApiUrl },
  })
  return { provide: { neon } }
})
