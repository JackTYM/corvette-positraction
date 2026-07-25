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

  const ALLOWED = ['application/pdf', 'image/webp', 'image/png', 'image/jpeg']
  if (!file.type || !ALLOWED.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported document type' })
  }
  const MAX_BYTES = 15 * 1024 * 1024
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Document too large (max 15MB)' })
  }

  const cfg = useRuntimeConfig()
  const filename = file.filename || 'document'
  const key = makeDocumentKey(userId, filename)
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), {
    method: 'PUT',
    body: file.data,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `R2 upload failed: ${res.status}` })
  }

  return { key, filename, mimeType: file.type, size: file.data.length, url: `${cfg.public.imageBaseUrl}/${key}` }
})
