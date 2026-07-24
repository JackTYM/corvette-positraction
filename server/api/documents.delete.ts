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

  const body = await readBody<{ key?: string }>(event)
  const key = body?.key
  if (!key || !isOwnedKey(key, userId)) {
    throw createError({ statusCode: 403, statusMessage: 'Not your document' })
  }

  const cfg = useRuntimeConfig()
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw createError({ statusCode: 502, statusMessage: `R2 delete failed: ${res.status}` })
  }

  return { ok: true }
})
