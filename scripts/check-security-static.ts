/**
 * Static security guards that are properties of the source tree, not of a
 * running app.
 *
 * - packages/007 is a PUBLIC repo: no key material in any tracked file.
 * - 007's CI can't hand secrets to a fork PR (no pull_request_target /
 *   workflow_run triggers).
 * - `--bundle <dir>`: the built client assets carry no key material, and not
 *   the value of any env var named in `BUNDLE_SECRET_ENV`. Run by CI's build
 *   job against `apps/web/.next/static`.
 *
 * Run: `bun scripts/check-security-static.ts` (also `bun run check:security`).
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function gitFiles(args: { cwd: string; patterns: string[] }): string[] {
  return execFileSync('git', ['ls-files', '--', ...args.patterns], {
    cwd: join(ROOT, args.cwd),
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map((f) => join(args.cwd, f))
}

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

/** Key material by shape: provider tokens, cloud keys, private keys. */
const KEY_MATERIAL =
  /(?<![A-Za-z0-9])(?:sk-[\w-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{10,}|lin_api_[A-Za-z0-9]{20,})|-----BEGIN [A-Z ]*PRIVATE KEY-----/

function check007KeyMaterial(): string[] {
  const problems: string[] = []
  for (const file of gitFiles({ cwd: 'packages/007', patterns: ['.'] })) {
    if (file.endsWith('bun.lock')) continue
    for (const [i, line] of read(file).split('\n').entries()) {
      if (KEY_MATERIAL.test(line)) {
        problems.push(`${file}:${i + 1} looks like key material`)
      }
    }
  }
  return problems
}

function check007WorkflowTriggers(): string[] {
  const dir = 'packages/007/.github/workflows'
  return readdirSync(join(ROOT, dir))
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => /pull_request_target|workflow_run/.test(read(`${dir}/${f}`)))
    .map((f) => {
      return `${dir}/${f} uses pull_request_target/workflow_run, which runs fork PRs with secrets`
    })
}

/**
 * Key material by shape, plus the exact VALUE of every env var named in
 * `BUNDLE_SECRET_ENV` (comma-separated) — CI's build step holds real secrets,
 * so it can prove none of them was inlined. Unset values are skipped.
 */
function checkClientBundle(dir: string): string[] {
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(
    (f) => /\.(?:js|css|html|json|map)$/.test(f),
  )
  if (files.length === 0) return [`${dir} holds no built assets`]
  const secrets = (process.env.BUNDLE_SECRET_ENV ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => (process.env[name] ?? '').length >= 8)
  const problems: string[] = []
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8')
    if (KEY_MATERIAL.test(text)) {
      problems.push(`${join(dir, f)} contains key material`)
    }
    for (const name of secrets) {
      if (text.includes(process.env[name] ?? '')) {
        problems.push(`${join(dir, f)} contains the value of ${name}`)
      }
    }
  }
  return problems
}

const bundleFlag = process.argv.indexOf('--bundle')

if (bundleFlag !== -1) {
  const dir = process.argv[bundleFlag + 1]
  const problems = checkClientBundle(dir)
  for (const p of problems) console.error(`  ✗ ${p}`)
  if (problems.length > 0) process.exit(1)
  console.log(`check-security-static --bundle: ${dir} carries no key material`)
} else {
  const problems = [...check007KeyMaterial(), ...check007WorkflowTriggers()]
  if (problems.length > 0) {
    console.error(`check-security-static: ${problems.length} problem(s)\n`)
    for (const p of problems) console.error(`  ✗ ${p}`)
    process.exit(1)
  }
  console.log(
    'check-security-static: 007 key material, 007 CI triggers — all OK',
  )
}
