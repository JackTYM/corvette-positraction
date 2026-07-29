export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    head: {
      title: "Corvette Positraction — A Collector's Archive",
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Rokkitt:wght@400;500;600;700;800;900&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Oswald:wght@400;500;600;700&family=Caveat:wght@500;600;700&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  nitro: { preset: 'cloudflare_pages' },
  runtimeConfig: {
    r2: {
      accessKeyId: '',
      secretAccessKey: '',
      endpoint: '',
      bucket: '',
    },
    public: {
      neonAuthUrl: '',
      neonDataApiUrl: '',
      imageBaseUrl: '',
    },
  },
})
