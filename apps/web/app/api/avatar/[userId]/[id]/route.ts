import { avatarBucket } from '@/lib/avatars'

/**
 * Serves a profile picture from R2. Public: keys are unguessable UUIDs, and
 * an avatar is shown to anyone who can see its owner. Keys are never reused,
 * so the response is cached as immutable.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string; id: string }> },
) {
  const { userId, id } = await params
  const object = await avatarBucket().get(`${userId}/${id}`)
  if (!object) return new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type':
        object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: object.httpEtag,
    },
  })
}
