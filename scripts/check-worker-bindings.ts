/**
 * Every binding and var declared in a Worker's `wrangler.jsonc` must appear in
 * that Worker's hand-written env type. Both env types are hand-written on
 * purpose (see their headers) — `wrangler types` output isn't reproducible
 * here — and this script is what makes that safe: a binding added to
 * `wrangler.jsonc` without a matching hand-edit typechecks clean and is
 * `undefined` at runtime.
 *
 * Only wrangler.jsonc ⊆ .d.ts is checked. The reverse is deliberately not:
 * secrets (`wrangler secret put`) appear only in the type, never in the config.
 * `env.*` blocks (staging) are walked too, so they can't drift either.
 *
 * Run: `bun scripts/check-worker-bindings.ts` (also `bun run check:bindings`).
 */

import { readFileSync } from 'node:fs'

type Target = {
  /** Worker name, for the failure message. */
  label: string
  config: string
  types: string
  /** Where to add a missing entry, quoted in the failure message. */
  hint: string
}

const TARGETS: Target[] = [
  {
    label: 'template-web',
    config: 'apps/web/wrangler.jsonc',
    types: 'apps/web/cloudflare-env.d.ts',
    hint: 'interface CloudflareEnv',
  },
  {
    label: 'template-workflows',
    config: 'apps/workflows/wrangler.jsonc',
    types: 'apps/workflows/worker-env.d.ts',
    hint: 'namespace Cloudflare { interface Env }',
  },
]

/**
 * JSONC → JSON. Comments and trailing commas out, string contents untouched —
 * which is the whole difficulty: both configs hold `"https://…"` values, and a
 * naive `//` strip would eat the rest of those lines and every line after.
 */
function stripJsonc(src: string): string {
  let out = ''
  let inString = false
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (inString) {
      out += c
      // A backslash consumes the next character whatever it is, so an escaped
      // quote can't end the string and an escaped backslash can't escape it.
      if (c === '\\') {
        out += src[i + 1] ?? ''
        i += 2
        continue
      }
      if (c === '"') inString = false
      i += 1
      continue
    }
    if (c === '"') {
      inString = true
      out += c
      i += 1
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1
      i += 2
      continue
    }
    out += c
    i += 1
  }
  // Trailing commas: legal in JSONC, fatal to JSON.parse. Only reached outside
  // strings because the walk above already emitted string bodies verbatim.
  return out.replaceAll(/,(\s*[}\]])/g, '$1')
}

type Json = { [k: string]: unknown }

/**
 * Every binding name in a parsed wrangler config.
 *
 * Found by shape rather than by an enumerated list of config keys: any object
 * carrying a string `binding` IS a binding, wherever it sits. That way a
 * binding type nobody here has used yet — Vectorize, Hyperdrive, KV — is
 * covered the day it lands, instead of silently slipping past a stale list.
 * Durable objects and send_email spell it `name`, so those two are named
 * explicitly. `queues.consumers` correctly contributes nothing: a consumer is
 * not a binding.
 */
function bindingNames(config: Json): Set<string> {
  const names = new Set<string>()

  const walk = (node: unknown, parentKey: string): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentKey)
      return
    }
    if (typeof node !== 'object' || node === null) return
    const obj = node as Json

    if (typeof obj.binding === 'string') names.add(obj.binding)
    if (
      (parentKey === 'bindings' || parentKey === 'send_email') &&
      typeof obj.name === 'string'
    ) {
      names.add(obj.name)
    }

    for (const [key, value] of Object.entries(obj)) {
      // `vars` keys are the names; their values are data, not config to walk.
      if (key === 'vars' && typeof value === 'object' && value !== null) {
        for (const varName of Object.keys(value)) names.add(varName)
        continue
      }
      walk(value, key)
    }
  }

  walk(config, '')
  return names
}

/** Does the env type declare a member with this name? */
function declares(types: string, name: string): boolean {
  return new RegExp(String.raw`^\s*${name}\??\s*:`, 'm').test(types)
}

let failed = 0

for (const target of TARGETS) {
  const raw = readFileSync(target.config, 'utf8')
  let config: Json
  try {
    config = JSON.parse(stripJsonc(raw)) as Json
  } catch (err) {
    console.error(
      `Worker bindings guard: could not parse ${target.config} — ${(err as Error).message}`,
    )
    failed += 1
    continue
  }

  const types = readFileSync(target.types, 'utf8')
  const names = [...bindingNames(config)].sort()
  const missing = names.filter((n) => !declares(types, n))

  if (missing.length > 0) {
    failed += 1
    console.error(
      `\n${target.label}: ${missing.length} binding(s)/var(s) in ${target.config} ` +
        `are not declared in ${target.types}:\n` +
        missing.map((n) => `  - ${n}`).join('\n') +
        `\n\nAdd each to \`${target.hint}\`, with a comment saying what it is for.\n` +
        `Do NOT run \`cf-typegen\` to fix this — it would delete every comment in\n` +
        `that file and pull in your local .env. See this script's header.`,
    )
  } else {
    console.log(
      `  ${target.label.padEnd(20)} ${names.length} bindings/vars declared`,
    )
  }
}

if (failed > 0) process.exit(1)
console.log('Worker bindings guard: OK')
