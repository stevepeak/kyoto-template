import { type NotificationCategory, notificationCategorySchema } from '@app/api'

// Signed, non-expiring unsubscribe links: `<payload>.<hmac>`, both base64url.
// No expiry on purpose — an unsubscribe link in a year-old email must still
// work. The payload is not secret (user id + category); the HMAC only stops
// one person unsubscribing another.

type UnsubscribePayload = { userId: string; category: NotificationCategory }

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    // Domain-separated, so this key never verifies anything else signed with
    // the same secret.
    encoder.encode(`unsubscribe:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signUnsubscribeToken(
  payload: UnsubscribePayload,
  secret: string,
): Promise<string> {
  const body = toBase64Url(
    encoder.encode(JSON.stringify({ u: payload.userId, c: payload.category })),
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(body),
  )
  return `${body}.${toBase64Url(new Uint8Array(sig))}`
}

/** The payload, or null for a malformed, tampered or unknown-category token. */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
): Promise<UnsubscribePayload | null> {
  const [body, sig, extra] = token.split('.')
  if (!body || !sig || extra !== undefined) return null
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(sig),
      encoder.encode(body),
    )
    if (!valid) return null
    const raw = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as {
      u?: unknown
      c?: unknown
    }
    const category = notificationCategorySchema.safeParse(raw.c)
    if (typeof raw.u !== 'string' || !category.success) return null
    return { userId: raw.u, category: category.data }
  } catch {
    return null
  }
}
