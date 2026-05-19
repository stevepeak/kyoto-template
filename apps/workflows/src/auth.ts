/**
 * Tiny HMAC-SHA256 scoped access tokens.
 *
 * Format: base64url(JSON({ runId, exp })) "." base64url(HMAC)
 *
 * The web tRPC layer asks the worker to mint a token for a specific runId.
 * The browser then includes it on the SSE/WS endpoint, which the worker
 * verifies before opening the WebSocket to the matching RunRoom DO.
 *
 * No JWT lib needed — Web Crypto handles everything.
 */

const ENCODER = new TextEncoder()
const TOKEN_TTL_SECONDS = 60 * 15

interface TokenPayload {
  runId: string
  exp: number
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ''
  for (const b of view) str += String.fromCharCode(b)
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret) {
    throw new Error(
      'TOKEN_SIGNING_KEY is not set. Generate one with `openssl rand -base64 32` and add it to the root .env (which is symlinked to apps/workflows/.dev.vars) for local dev, or run `wrangler secret put TOKEN_SIGNING_KEY` for prod.',
    )
  }
  return await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signRunToken(
  runId: string,
  secret: string,
): Promise<string> {
  const payload: TokenPayload = {
    runId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const body = base64UrlEncode(ENCODER.encode(JSON.stringify(payload)))
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(body))
  return `${body}.${base64UrlEncode(sig)}`
}

export async function verifyRunToken(
  token: string,
  expectedRunId: string,
  secret: string,
): Promise<boolean> {
  const [body, sig] = token.split('.')
  if (!body || !sig) return false

  const sigBytes = base64UrlDecode(sig)
  const sigBuffer = sigBytes.buffer.slice(
    sigBytes.byteOffset,
    sigBytes.byteOffset + sigBytes.byteLength,
  ) as ArrayBuffer

  const key = await importKey(secret)
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBuffer,
    ENCODER.encode(body),
  )
  if (!ok) return false

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body)),
    ) as TokenPayload
    if (payload.runId !== expectedRunId) return false
    if (payload.exp < Math.floor(Date.now() / 1000)) return false
    return true
  } catch {
    return false
  }
}
