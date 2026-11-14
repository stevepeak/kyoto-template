import { cfEnv } from './cf-env'

/**
 * Profile pictures live in the AVATARS R2 bucket under `<userId>/<uuid>` and
 * are served back by `/api/avatar/<userId>/<uuid>`. Every upload gets a fresh
 * key, so the URL stored in `user.image` can be cached forever.
 */

export const AVATAR_URL_PREFIX = '/api/avatar/'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/** No SVG: it's served from our origin, and SVG can carry script. */
export const AVATAR_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const

export function avatarBucket(): R2Bucket {
  const bucket = cfEnv().AVATARS
  if (!bucket) {
    throw new Error(
      'AVATARS (R2) binding is not available. Run via `next dev` (OpenNext dev proxy) or deploy to Workers.',
    )
  }
  return bucket
}

export function avatarUrl(key: string): string {
  return `${AVATAR_URL_PREFIX}${key}`
}

/** The R2 key behind an image URL, or null for a URL we didn't issue (e.g. Google's). */
export function avatarKeyFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.startsWith(AVATAR_URL_PREFIX)) return null
  return url.slice(AVATAR_URL_PREFIX.length)
}

/** Deletes every avatar object of `userId` except the keys in `keep`. */
export async function pruneAvatars(
  bucket: R2Bucket,
  userId: string,
  keep: (string | null)[],
): Promise<void> {
  const listed = await bucket.list({ prefix: `${userId}/` })
  const stale = listed.objects
    .map((o) => o.key)
    .filter((key) => !keep.includes(key))
  if (stale.length > 0) await bucket.delete(stale)
}
