import { createHash, createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'jsonc-parser'
import { z } from 'zod'

// Resolving WHICH local miniflare SQLite file is which.
//
// Node-only (`node:fs`) — imported by drizzle configs and scripts, never by
// Worker code. It is deliberately NOT re-exported from the package barrel.
//
// Miniflare names each local D1 file after its Durable Object id, derived from
// the binding's `database_id`. Stale files from an earlier `database_id` (e.g.
// the placeholder id before the real one was pasted in) stay on disk with the
// same tables, so probing files by their contents can't tell old from current.
// Deriving the filename from the configured id can.

export type FindLocalD1Options = {
  /** Repo-root-relative or absolute path to `.wrangler/state`. */
  stateDir: string
  /** Path to the wrangler config that declares the database. */
  wranglerConfig: string
  /** `database_name` of the D1 in that config, e.g. 'template-db'. */
  databaseName: string
  /** Command suggested when the file is missing, e.g. 'bun run db:migrate:local'. */
  hint: string
}

const D1_SUBDIR = 'v3/d1/miniflare-D1DatabaseObject'
const D1_UNIQUE_KEY = 'miniflare-D1DatabaseObject'

const wranglerD1Schema = z.object({
  d1_databases: z
    .array(z.object({ database_name: z.string(), database_id: z.string() }))
    .default([]),
})

/**
 * Miniflare's `durableObjectNamespaceIdFromName`: a D1's local file is named
 * after the DO id it derives from the database id.
 */
function durableObjectIdFromName(args: {
  uniqueKey: string
  name: string
}): string {
  const key = createHash('sha256').update(args.uniqueKey).digest()
  const nameHmac = createHmac('sha256', key)
    .update(args.name)
    .digest()
    .subarray(0, 16)
  const hmac = createHmac('sha256', key)
    .update(nameHmac)
    .digest()
    .subarray(0, 16)
  return `${nameHmac.toString('hex')}${hmac.toString('hex')}`
}

/**
 * Path to the local miniflare SQLite for `databaseName` as configured in
 * `wranglerConfig`. Throws with an actionable message when the database isn't
 * declared there or hasn't been created locally yet.
 */
export function findLocalD1(opts: FindLocalD1Options): string {
  const databaseId = wranglerD1Schema
    .parse(parse(readFileSync(opts.wranglerConfig, 'utf8')))
    .d1_databases.find(
      (d) => d.database_name === opts.databaseName,
    )?.database_id
  if (!databaseId) {
    throw new Error(
      `No D1 named ${opts.databaseName} with a database_id in ${opts.wranglerConfig}.`,
    )
  }

  const file = join(
    opts.stateDir,
    D1_SUBDIR,
    `${durableObjectIdFromName({ uniqueKey: D1_UNIQUE_KEY, name: databaseId })}.sqlite`,
  )
  if (!existsSync(file)) {
    throw new Error(
      `No local D1 for ${opts.databaseName} (${databaseId}) at ${file}. ` +
        `Run \`${opts.hint}\` first to create and migrate it.`,
    )
  }
  return file
}
