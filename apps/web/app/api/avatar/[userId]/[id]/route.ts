import { avatars } from '@/lib/avatars'

/**
 * Serves a profile picture from R2. Public: keys are unguessable UUIDs, and
 * an avatar is shown to anyone who can see its owner.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string; id: string }> },
) {
  const { userId, id } = await params
  return await avatars.serve(`${userId}/${id}`)
}
