import { describe, it, expect } from 'vitest'
import { isOwnedKey, makeImageKey, objectUrl } from './r2'

describe('makeImageKey', () => {
  it('prefixes the key with the user id and a .webp extension', () => {
    const key = makeImageKey('user-123')
    expect(key.startsWith('user-123/')).toBe(true)
    expect(key.endsWith('.webp')).toBe(true)
  })
  it('produces a unique key on each call', () => {
    expect(makeImageKey('user-123')).not.toBe(makeImageKey('user-123'))
  })
})

describe('isOwnedKey', () => {
  it('accepts a key prefixed with the user id', () => {
    expect(isOwnedKey('user-123/abc.webp', 'user-123')).toBe(true)
  })
  it('rejects a key belonging to another user', () => {
    expect(isOwnedKey('user-999/abc.webp', 'user-123')).toBe(false)
  })
  it('rejects path traversal attempts', () => {
    expect(isOwnedKey('user-123/../user-999/abc.webp', 'user-123')).toBe(false)
  })
  it('rejects an absolute path', () => {
    expect(isOwnedKey('/etc/passwd', 'user-123')).toBe(false)
  })
})

describe('objectUrl', () => {
  it('joins endpoint, bucket, and key with slashes, encoding the key', () => {
    expect(objectUrl('https://acct.r2.cloudflarestorage.com', 'my-bucket', 'user-123/abc def.webp'))
      .toBe('https://acct.r2.cloudflarestorage.com/my-bucket/user-123/abc%20def.webp')
  })
})
