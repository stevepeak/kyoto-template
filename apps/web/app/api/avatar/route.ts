import { headers } from 'next/headers'

import { getAuth } from '@/lib/auth'
import {
  AVATAR_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarBucket,
  avatarKeyFromUrl,
  avatarUrl,
  pruneAvatars,
} from '@/lib/avatars'

/**
 * Uploads a profile picture to R2 and returns its URL. The client then saves
 * it with `authClient.updateUser({ image })`, which also refreshes the session
 * cookie cache and every `useSession` — so this route never writes `user.image`.
 *
 * Old uploads are pruned here, keeping the one currently on the profile (in
 * case the client never saves the new one) and the new one.
 */
export async function POST(req: Request) {
  // Skip the cookie cache: a stale `user.image` would prune the live avatar.
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (!(AVATAR_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return Response.json(
      { error: 'Use a PNG, JPEG, WebP or GIF image' },
      { status: 415 },
    )
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return Response.json(
      { error: 'Image must be 2 MB or smaller' },
      { status: 413 },
    )
  }

  const userId = session.user.id
  const key = `${userId}/${crypto.randomUUID()}`
  const bucket = avatarBucket()
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })
  await pruneAvatars(bucket, userId, [
    key,
    avatarKeyFromUrl(session.user.image),
  ])

  return Response.json({ url: avatarUrl(key) })
}

/**
 * Deletes uploads no longer on the profile. Called after the client clears
 * `user.image`, so it removes every upload.
 */
export async function DELETE() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await pruneAvatars(avatarBucket(), session.user.id, [
    avatarKeyFromUrl(session.user.image),
  ])
  return new Response(null, { status: 204 })
}
