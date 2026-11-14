import type { D1Database } from '@cloudflare/workers-types'
import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1'
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { z } from 'zod'

import * as schema from './schema'

// Export schema and all its contents
export { schema }
export type { AuditEventDetail, AuditEventType } from './audit-schema'

export { D1_LIMITS } from './d1-limits'

// Re-export drizzle-orm helpers to ensure single instance across monorepo

// Export inferred types for tables
// Add your table types here as you create them

/**
 * Creates a Drizzle database client bound to a Cloudflare D1 database.
 *
 * D1 is a Worker binding (`env.DB`), not a connection string, and is only
 * available inside a request — never at module load. Call this in the request
 * path (tRPC context, route handler, workflow step), passing the binding from
 * `getCloudflareContext().env.DB` (web) or `env.DB` (workflows worker).
 *
 * @example
 * ```ts
 * import { createDb } from '@app/db'
 * import { getCloudflareContext } from '@opennextjs/cloudflare'
 *
 * const { env } = getCloudflareContext()
 * const db = createDb(env.DB)
 * ```
 */
export type DB = DrizzleD1Database<typeof schema>

export function createDb(d1: D1Database): DB {
  return drizzle(d1, { schema })
}

export interface CreateDbHttpOptions {
  accountId: string
  databaseId: string
  token: string
}

// The slice of the D1 `/raw` REST envelope we read. Everything else on the
// wire is ignored, which is why the object schemas are left loose.
const d1RawResponseSchema = z.object({
  success: z.boolean(),
  errors: z.unknown().optional(),
  result: z
    .array(
      z.object({
        results: z
          .object({ rows: z.array(z.array(z.unknown())).optional() })
          .optional(),
      }),
    )
    .optional(),
})

/**
 * Creates a Drizzle client that talks to D1 over its REST API.
 *
 * For Node contexts that have no Worker binding — CLI scripts and CI jobs
 * (e.g. seed scripts). Requires a Cloudflare API token
 * with D1 access. The query API is identical to `createDb`; `db.batch()` is
 * not wired here (the proxy driver would need a batch callback), so scripts
 * should issue statements individually.
 */
export function createDbHttp(opts: CreateDbHttpOptions): DB {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/d1/database/${opts.databaseId}/raw`

  return drizzleProxy(
    async (query, params, method) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: query, params }),
      })
      const json: unknown = await res.json()
      const parsed = d1RawResponseSchema.safeParse(json)
      if (!parsed.success) {
        throw new Error(
          `D1 HTTP query returned an unexpected body (HTTP ${res.status}): ${JSON.stringify(json)}`,
        )
      }
      const data = parsed.data
      if (!res.ok || !data.success) {
        throw new Error(`D1 HTTP query failed: ${JSON.stringify(data.errors)}`)
      }
      // The `/raw` endpoint returns rows as arrays of column values, which is
      // exactly the shape sqlite-proxy expects.
      const rows = data.result?.[0]?.results?.rows ?? []
      return { rows: method === 'get' ? (rows[0] ?? []) : rows }
    },
    { schema },
  ) as unknown as DB
}

// `alias` comes from the sqlite-core entry, not the root — re-exported here
// with the rest so callers get one drizzle instance across the monorepo.
export { alias } from 'drizzle-orm/sqlite-core'

export {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  type InferSelectModel,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  max,
  ne,
  notExists,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
