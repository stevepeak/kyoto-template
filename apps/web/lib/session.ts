import type { SessionUser } from '@app/api'
import type { DB } from '@app/db'

import { getAuth } from './auth'

/**
 * Reads the Better Auth session off the request, shaped for the tRPC context.
 * `null` for an anonymous request.
 */
export async function readSessionUser(
  req: Request,
  db: DB,
): Promise<SessionUser | null> {
  const session = await getAuth(db).api.getSession({ headers: req.headers })
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  }
}
