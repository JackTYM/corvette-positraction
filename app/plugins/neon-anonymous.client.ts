import { createClient } from '@neondatabase/neon-js'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()
  const neonAnonymous = createClient({
    auth: { url: cfg.public.neonAuthUrl, allowAnonymous: true },
    dataApi: { url: cfg.public.neonDataApiUrl },
  })
  return { provide: { neonAnonymous } }
})
