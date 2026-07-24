import { AwsClient } from 'aws4fetch'

export function makeImageKey(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.webp`
}

export function makeDocumentKey(userId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_')
  return `${userId}/docs/${crypto.randomUUID()}-${safe}`
}

export function isOwnedKey(key: string, userId: string): boolean {
  if (!key || key.includes('..') || key.startsWith('/')) return false
  return key.startsWith(`${userId}/`)
}

export function objectUrl(endpoint: string, bucket: string, key: string): string {
  const encoded = encodeURIComponent(key).replace(/%2F/g, '/')
  return `${endpoint}/${bucket}/${encoded}`
}

let cachedClient: AwsClient | null = null

export function getR2Client(): AwsClient {
  if (!cachedClient) {
    const cfg = useRuntimeConfig()
    cachedClient = new AwsClient({
      accessKeyId: cfg.r2.accessKeyId,
      secretAccessKey: cfg.r2.secretAccessKey,
      service: 's3',
      region: 'auto',
    })
  }
  return cachedClient
}
