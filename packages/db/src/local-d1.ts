import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Resolving WHICH local miniflare SQLite file is which.
//
// Node-only (`node:fs`) — imported by drizzle configs and scripts, never by
// Worker code. It is deliberately NOT re-exported from the package barrel.
//
// Miniflare names each local D1 after a content hash of its binding, so the
// filename tells you nothing about which database it holds. There is more than
// one real D1 in this repo (`kyoto-db` app tables, `kyoto-wf` 007's wf_* tables), so
// "the first .sqlite that isn't metadata.sqlite" picks a database at readdir
// order, which is not guaranteed — and a stray 8 KB file from a mistyped
// binding satisfies that heuristic too.
//
// So a database is identified by the tables it CONTAINS (`require`), and when
// two databases could both match, by tables it must NOT contain (`exclude`).
// Getting this wrong is not a crash — it silently reads, or writes, the wrong
// database.
//
// The caller supplies the probe because the two runtimes differ: drizzle-kit
// configs run under Node with better-sqlite3, repo scripts run under Bun with
// bun:sqlite.

export type LocalD1Probe = (file: string, table: string) => boolean

export type FindLocalD1Options = {
  /** Repo-root-relative or absolute path to `.wrangler/state`. */
  stateDir: string
  /** Reports whether `table` exists in the SQLite file at `file`. */
  hasTable: LocalD1Probe
  /** Tables that must ALL be present. */
  require: string[]
  /** Tables that must ALL be absent — needed to tell two similar databases apart. */
  exclude?: string[]
  /** Database name used in the error message, e.g. 'kyoto-db'. */
  label: string
  /** Command suggested when nothing matches, e.g. 'bun run db:migrate:local'. */
  hint: string
}

const D1_SUBDIR = 'v3/d1/miniflare-D1DatabaseObject'

/**
 * Absolute path to the local miniflare SQLite holding the requested schema.
 * Throws with an actionable message when there is no match, and when more than
 * one file matches — an ambiguous match means the predicate is too loose, and
 * silently picking one is how you corrupt the wrong database.
 */
export function findLocalD1(opts: FindLocalD1Options): string {
  const dir = join(opts.stateDir, D1_SUBDIR)
  if (!existsSync(dir)) {
    throw new Error(
      `No local D1 state at ${dir}. Run \`${opts.hint}\` first to create and migrate it.`,
    )
  }

  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
    .map((f) => join(dir, f))
    .filter((file) => {
      for (const table of opts.require) {
        if (!opts.hasTable(file, table)) return false
      }
      for (const table of opts.exclude ?? []) {
        if (opts.hasTable(file, table)) return false
      }
      return true
    })

  if (candidates.length === 0) {
    throw new Error(
      `No local D1 in ${dir} matches ${opts.label} ` +
        `(needs ${opts.require.join(', ')}` +
        `${opts.exclude?.length ? `; must not have ${opts.exclude.join(', ')}` : ''}). ` +
        `Run \`${opts.hint}\` first.`,
    )
  }
  if (candidates.length > 1) {
    throw new Error(
      `Ambiguous local D1 for ${opts.label} — ${candidates.length} files match ` +
        `(${candidates.join(', ')}). Tighten \`require\`/\`exclude\` rather than ` +
        `picking one; guessing here reads or writes the wrong database.`,
    )
  }
  return candidates[0]
}
