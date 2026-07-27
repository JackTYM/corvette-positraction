const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}
const SOURCE_ORIGIN = 'https://smalldiecastcorvettes.com/'
const MAX_BYTES = 8 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const auth = getHeader(event, 'authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })

  let userId: string
  try {
    userId = await verifyNeonJwt(token, getNeonJwks())
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  const body = await readBody<{ sourceUrl?: string }>(event)
  const sourceUrl = body?.sourceUrl
  if (!sourceUrl || !sourceUrl.startsWith(SOURCE_ORIGIN)) {
    throw createError({ statusCode: 400, statusMessage: `sourceUrl must start with ${SOURCE_ORIGIN}` })
  }

  const sourceRes = await fetch(sourceUrl)
  if (!sourceRes.ok) {
    throw createError({ statusCode: 502, statusMessage: `Failed to fetch source image: ${sourceRes.status}` })
  }

  const contentType = sourceRes.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  const ext = ALLOWED_CONTENT_TYPES[contentType]
  if (!ext) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }

  const buffer = new Uint8Array(await sourceRes.arrayBuffer())
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image too large (max 8MB) or empty' })
  }

  const cfg = useRuntimeConfig()
  const key = makeImageKey(userId, ext)
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), {
    method: 'PUT',
    body: buffer,
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `R2 upload failed: ${res.status}` })
  }

  return { key, url: `${cfg.public.imageBaseUrl}/${key}` }
})
