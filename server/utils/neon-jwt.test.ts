import { describe, it, expect } from 'vitest'
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose'
import { verifyNeonJwt } from './neon-jwt'

async function makeKeySet() {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const publicJwk = await exportJWK(publicKey)
  publicJwk.kid = 'test-key'
  publicJwk.alg = 'RS256'
  return { privateKey, keySet: createLocalJWKSet({ keys: [publicJwk] }) }
}

describe('verifyNeonJwt', () => {
  it('returns the sub claim for a validly signed token', async () => {
    const { privateKey, keySet } = await makeKeySet()
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    await expect(verifyNeonJwt(token, keySet)).resolves.toBe('user-123')
  })

  it('rejects a token signed by a different key', async () => {
    const { keySet } = await makeKeySet()
    const { privateKey: otherKey } = await generateKeyPair('RS256')
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setExpirationTime('5m')
      .sign(otherKey)
    await expect(verifyNeonJwt(token, keySet)).rejects.toThrow()
  })

  it('rejects an expired token', async () => {
    const { privateKey, keySet } = await makeKeySet()
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 1800)
      .sign(privateKey)
    await expect(verifyNeonJwt(token, keySet)).rejects.toThrow()
  })

  it('rejects a token with no sub claim', async () => {
    const { privateKey, keySet } = await makeKeySet()
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setExpirationTime('5m')
      .sign(privateKey)
    await expect(verifyNeonJwt(token, keySet)).rejects.toThrow('JWT missing sub claim')
  })
})
