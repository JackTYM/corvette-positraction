import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

let cachedJwks: JWTVerifyGetKey | null = null

export function getNeonJwks(): JWTVerifyGetKey {
  if (!cachedJwks) {
    const cfg = useRuntimeConfig()
    cachedJwks = createRemoteJWKSet(new URL(cfg.public.neonAuthUrl + '/.well-known/jwks.json'))
  }
  return cachedJwks
}

export async function verifyNeonJwt(token: string, keySet: JWTVerifyGetKey): Promise<string> {
  const { payload } = await jwtVerify(token, keySet)
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('JWT missing sub claim')
  }
  return payload.sub
}
