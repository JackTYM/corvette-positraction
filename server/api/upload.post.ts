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

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  if (!file || !file.data || file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file' })
  }

  const ALLOWED = ['image/webp', 'image/png', 'image/jpeg']
  if (!file.type || !ALLOWED.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }
  const MAX_BYTES = 8 * 1024 * 1024
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image too large (max 8MB)' })
  }

  const cfg = useRuntimeConfig()
  const key = makeImageKey(userId)
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), {
    method: 'PUT',
    body: file.data,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `R2 upload failed: ${res.status}` })
  }

  return { key, url: `${cfg.public.imageBaseUrl}/${key}` }
})
