#!/usr/bin/env bun
/**
 * Fails when the `packages/007` submodule's standalone `bun.lock` has drifted
 * from its own `package.json`.
 *
 * The submodule is a separate repo (github.com/stevepeak/007) with its own CI,
 * and that CI installs with `--frozen-lockfile`. This monorepo never validates
 * that lockfile: the root install resolves 007 as a workspace member against the
 * ROOT bun.lock and never reads the submodule's. So a dependency bump inside
 * packages/007/package.json that isn't followed by `bun run lock` leaves a
 * lockfile only the submodule's CI will reject — and only after someone pushes
 * it there and goes looking.
 *
 * That is not hypothetical. Every 007 CI run from 2026-09-03 to 2026-09-15
 * failed in six seconds on `error: lockfile had changes, but lockfile is
 * frozen`, so nothing in that package was typechecked, linted or tested for two
 * weeks, while this repo's CI stayed green the entire time. This check moves
 * that failure into the run that causes it.
 *
 * It compares the dependency ranges in `package.json` against the copy bun
 * mirrors into the lockfile's root workspace entry — the exact pair bun's own
 * frozen check compares. No network, no install, no database.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'

// Default target, overridable so the check is reusable (and testable) against
// any checkout of the submodule.
const dir = process.argv[2] ?? 'packages/007'

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

type DepMap = Record<string, string>

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

/**
 * bun.lock is JSONC — trailing commas everywhere — so `JSON.parse` rejects it.
 * TypeScript's config reader is the parser already in this repo that handles
 * that dialect, which beats a hand-rolled comma-stripping regex over a file
 * whose values are full of punctuation.
 */
function parseJsonc(path: string): Record<string, unknown> {
  const parsed = ts.parseConfigFileTextToJson(path, readFileSync(path, 'utf8'))
  if (parsed.error) {
    fail(
      `${path} could not be parsed: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, ' ')}`,
    )
  }
  // `.config` is typed `any` by TypeScript; widen to unknown and narrow here
  // rather than trusting it.
  const config: unknown = parsed.config
  if (typeof config !== 'object' || config === null) {
    fail(`${path} did not parse to an object.`)
  }
  return config as Record<string, unknown>
}

function depsOf(source: Record<string, unknown>, field: string): DepMap {
  const value = source[field]
  if (typeof value !== 'object' || value === null) return {}
  const out: DepMap = {}
  for (const [name, range] of Object.entries(value)) {
    if (typeof range === 'string') out[name] = range
  }
  return out
}

const pkgPath = join(dir, 'package.json')
const lockPath = join(dir, 'bun.lock')

if (!existsSync(pkgPath) || !existsSync(lockPath)) {
  fail(
    `Cannot check ${dir}: ${pkgPath} or ${lockPath} is missing.\n` +
      `The submodule is probably not checked out — run:\n` +
      `  git submodule update --init --recursive`,
  )
}

const pkg = parseJsonc(pkgPath)
const lock = parseJsonc(lockPath)

// bun records every workspace it resolved; "" is the root of that lockfile,
// i.e. the submodule itself when the lockfile was generated standalone.
const workspaces = lock.workspaces
if (typeof workspaces !== 'object' || workspaces === null) {
  fail(`${lockPath} has no "workspaces" entry — it is not a bun lockfile.`)
}
const root = (workspaces as Record<string, unknown>)['']
if (typeof root !== 'object' || root === null) {
  fail(
    `${lockPath} has no root ("") workspace entry.\n` +
      `Regenerate it with: bun run --cwd ${dir} lock`,
  )
}
const rootEntry = root as Record<string, unknown>

type Drift = { field: string; name: string; pkg?: string; lock?: string }
const drift: Drift[] = []

for (const field of DEP_FIELDS) {
  const fromPkg = depsOf(pkg, field)
  const fromLock = depsOf(rootEntry, field)
  for (const name of new Set([
    ...Object.keys(fromPkg),
    ...Object.keys(fromLock),
  ])) {
    if (fromPkg[name] !== fromLock[name]) {
      drift.push({ field, name, pkg: fromPkg[name], lock: fromLock[name] })
    }
  }
}

if (drift.length > 0) {
  const lines = drift
    .sort(
      (a, b) => a.field.localeCompare(b.field) || a.name.localeCompare(b.name),
    )
    .map((d) => {
      return (
        `  ${d.field}  ${d.name}\n` +
        `      package.json: ${d.pkg ?? '(absent)'}\n` +
        `      bun.lock:     ${d.lock ?? '(absent)'}`
      )
    })
  fail(
    `${lockPath} is out of sync with ${pkgPath}.\n\n` +
      `${lines.join('\n')}\n\n` +
      `The submodule's own CI installs with --frozen-lockfile and will fail on this.\n` +
      `Fix: bun run --cwd ${dir} lock   (then commit ${lockPath} in the submodule)`,
  )
}

console.log(
  `${lockPath} matches ${pkgPath} (${DEP_FIELDS.map((f) => Object.keys(depsOf(pkg, f)).length).reduce((a, b) => a + b, 0)} dependency ranges).`,
)
