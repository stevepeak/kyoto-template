import { headers } from 'next/headers'

import { getAuth } from '@/lib/auth'
import { avatars } from '@/lib/avatars'

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

  const upload = await avatars.readFile(req)
  if ('error' in upload) return upload.error

  const userId = session.user.id
  const { key, url } = await avatars.put(userId, upload.file)
  await avatars.prune(userId, [key, avatars.keyFromUrl(session.user.image)])

  return Response.json({ url })
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

  await avatars.prune(session.user.id, [avatars.keyFromUrl(session.user.image)])
  return new Response(null, { status: 204 })
}
