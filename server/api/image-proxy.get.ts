// Same-origin passthrough for already-uploaded R2 photos so the client-side crop tool can
// draw them onto a <canvas> without tainting it -- image.corvettepositraction.com doesn't
// send Access-Control-Allow-Origin, so a cross-origin <img> load can't be read back out of
// a canvas (toBlob/getImageData throw a SecurityError). Routing the fetch through our own
// origin sidesteps that entirely. This only ever reads already-public R2 keys, so it doesn't
// need auth -- it grants no access beyond what the direct R2 URL already exposes.
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg'])
const KEY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/

export default defineEventHandler(async (event) => {
  const key = String(getQuery(event).key ?? '')
  if (!key || key.length > 300 || key.includes('..') || !KEY_PATTERN.test(key)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid key' })
  }

  const cfg = useRuntimeConfig()
  const sourceUrl = `${cfg.public.imageBaseUrl}/${key}`
  const res = await fetch(sourceUrl)
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Image fetch failed: ${res.status}` })
  }
  if (!res.url.startsWith(cfg.public.imageBaseUrl)) {
    throw createError({ statusCode: 502, statusMessage: 'Resolved image URL left the image host' })
  }

  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }

  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw createError({ statusCode: 502, statusMessage: 'Image too large or empty' })
  }

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=14400')
  return bytes
})
