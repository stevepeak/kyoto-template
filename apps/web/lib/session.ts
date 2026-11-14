import type { SessionUser } from '@app/api'
import { type DB, eq, schema } from '@app/db'

import { getAuth } from './auth'

/** Where a personal API key goes (the api-key plugin's default header). */
const API_KEY_HEADER = 'x-api-key'

/**
 * Reads the caller off the request, shaped for the tRPC context: a personal
 * API key in `x-api-key` when one is sent, else the Better Auth session.
 * `null` for an anonymous request or a key that doesn't verify.
 */
export async function readSessionUser(
  req: Request,
  db: DB,
): Promise<SessionUser | null> {
  const key = req.headers.get(API_KEY_HEADER)
  if (key) return await readApiKeyUser({ key, db })

  const session = await getAuth(db).api.getSession({ headers: req.headers })
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  }
}

/** The owner of a valid, enabled, unexpired key — unless they're banned. */
async function readApiKeyUser(args: {
  key: string
  db: DB
}): Promise<SessionUser | null> {
  const result = await getAuth(args.db).api.verifyApiKey({
    body: { key: args.key },
  })
  if (!result.valid || !result.key) return null

  const [row] = await args.db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      banned: schema.user.banned,
      banExpires: schema.user.banExpires,
    })
    .from(schema.user)
    .where(eq(schema.user.id, result.key.referenceId))
    .limit(1)
  if (!row) return null
  // A ban revokes sessions; a key must stop working too.
  const banned =
    row.banned === true && (!row.banExpires || row.banExpires > new Date())
  if (banned) return null
  return { id: row.id, email: row.email, name: row.name ?? null }
}
