/**
 * Test harness for the app database (`@app/db/testing`).
 *
 * `freshDb()` is an in-memory `bun:sqlite` built by replaying the REAL
 * `packages/db/migrations` — so a schema test exercises the migrations
 * production runs, not a hand-maintained mirror of them. The fixture writers
 * below insert the minimum row for a table; every column they do not take has
 * a sensible test default.
 *
 * Not imported by production code: nothing under `src/` reaches this module
 * except `*.test.ts` files.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'

import { D1_LIMITS } from './d1-limits'
import * as schema from './schema'

import type { DB } from './index'

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url))

/**
 * A database with every migration applied and foreign keys ON.
 *
 * Pass `onQuery` to observe each SQL statement as it runs — the way to prove a
 * code path does N queries, or one.
 *
 * The handle enforces {@link D1_LIMITS} and refuses `transaction()`, so a
 * query D1 would reject fails here too (see {@link d1Guard}).
 *
 * `batch` is a D1 API; bun:sqlite has none. Callers that pair a row with its
 * audit event in one batch get the statements run in order instead. What the
 * shim deliberately does NOT reproduce is D1's atomicity, so a test cannot
 * claim two rows land together — only that both are correct.
 */
export function freshDb(opts: { onQuery?: (sql: string) => void } = {}): DB {
  const sqlite = new Database(':memory:')
  // Foreign keys default OFF in SQLite, which would let fixtures insert rows
  // for parents that don't exist — the opposite of what a schema test wants.
  sqlite.run('PRAGMA foreign_keys = ON')
  // D1 owns this table; stubbed so a migration that touches it still replays.
  sqlite.run('CREATE TABLE IF NOT EXISTS d1_migrations (id integer, name text)')
  for (const f of readdirSync(MIGRATIONS_DIR)
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const file = readFileSync(`${MIGRATIONS_DIR}/${f}`, 'utf8')
    for (const stmt of file.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim()
      if (trimmed) sqlite.run(trimmed)
    }
  }
  // `onQuery` sees every statement Drizzle issues, so a test can assert on the
  // SHAPE of the work (one query, not one per row) rather than only its result.
  const logger = opts.onQuery
    ? { logQuery: (sql: string) => opts.onQuery!(sql) }
    : undefined
  const db = drizzle(d1Guard(sqlite), { schema, logger })
  return Object.assign(db, {
    batch: (statements: readonly Promise<unknown>[]) => {
      return statements.reduce<Promise<unknown[]>>(
        async (acc, statement) => [...(await acc), await statement],
        Promise.resolve([]),
      )
    },
  }) as unknown as DB
}

const TX_STATEMENT = /^\s*(?:begin|commit|end|rollback|savepoint|release)\b/i

const utf8 = new TextEncoder()

function d1Error(message: string): Error {
  return new Error(`D1_ERROR: ${message} (bun:sqlite test guard)`)
}

function checkSql(sql: string) {
  if (utf8.encode(sql).byteLength > D1_LIMITS.statementBytes) {
    throw d1Error('statement too long: SQLITE_TOOBIG')
  }
  if (TX_STATEMENT.test(sql)) {
    throw d1Error('interactive transactions are not supported; use batch()')
  }
}

function checkBinds(params: unknown[]) {
  // bun:sqlite takes binds either spread or as one array.
  const binds: unknown[] =
    params.length === 1 && Array.isArray(params[0]) ? params[0] : params
  if (binds.length > D1_LIMITS.boundParams) {
    throw d1Error(
      `too many SQL variables (${binds.length} > ${D1_LIMITS.boundParams})`,
    )
  }
  for (const value of binds) {
    const bytes =
      typeof value === 'string'
        ? utf8.encode(value).byteLength
        : ArrayBuffer.isView(value) || value instanceof ArrayBuffer
          ? value.byteLength
          : 0
    if (bytes > D1_LIMITS.valueBytes) {
      throw d1Error(`string or blob too big: SQLITE_TOOBIG (${bytes} bytes)`)
    }
  }
}

type AnyFn = (this: unknown, ...args: unknown[]) => unknown
function asFn(v: unknown): AnyFn | null {
  return typeof v === 'function' ? (v as AnyFn) : null
}

const EXECUTORS = new Set(['all', 'get', 'run', 'values', 'iterate'])

/**
 * Proxy a migrated `bun:sqlite` handle so every statement it prepares obeys
 * {@link D1_LIMITS}. Applied AFTER the migration replay: migrations are not
 * subject to the per-query limits and run through `run` on the raw handle.
 */
function d1Guard(sqlite: Database): Database {
  // Drizzle prepares a statement and then hands the binds to an executor, so
  // the executor's arguments are exactly what D1 would be asked to bind.
  const wrapStatement = (stmt: object) => {
    return new Proxy(stmt, {
      get(target, prop, receiver) {
        const value: unknown = Reflect.get(target, prop, receiver)
        const fn = asFn(value)
        if (!fn) return value
        if (!EXECUTORS.has(String(prop))) return fn.bind(target)
        return (...params: unknown[]) => {
          checkBinds(params)
          return Reflect.apply(fn, target, params)
        }
      },
    })
  }
  return new Proxy(sqlite, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver)
      const fn = asFn(value)
      if (!fn) return value
      if (prop === 'transaction') {
        return () => {
          throw d1Error(
            'interactive transactions are not supported; use batch()',
          )
        }
      }
      if (prop === 'prepare' || prop === 'query') {
        return (...args: unknown[]) => {
          checkSql(String(args[0]))
          return wrapStatement(Reflect.apply(fn, target, args) as object)
        }
      }
      return fn.bind(target)
    },
  })
}

export async function addUser(
  db: DB,
  args: {
    id: string
    name?: string
    email?: string
    image?: string | null
    /** Defaults to true; false models an invitee who never opened their link. */
    emailVerified?: boolean
  },
) {
  await db.insert(schema.user).values({
    id: args.id,
    name: args.name ?? args.id,
    email: args.email ?? `${args.id}@test`,
    emailVerified: args.emailVerified ?? true,
    image: args.image ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}
