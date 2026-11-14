import { createDb, type DB } from '@app/db'

import { cfEnv } from './cf-env'

/**
 * The app's D1 database for this request. D1 is a binding, only available
 * inside a request — never call this at module scope.
 */
export function getDb(): DB {
  const d1 = cfEnv().DB
  if (!d1) {
    throw new Error(
      'DB (D1) binding is not available. Run via `next dev` (OpenNext dev proxy) or deploy to Workers, and run `bun run db:migrate:local` first.',
    )
  }
  return createDb(d1)
}
