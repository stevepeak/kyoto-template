import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * The one place the app reads Cloudflare bindings.
 *
 * `CloudflareEnv` (cloudflare-env.d.ts) is the declared shape of
 * `wrangler.jsonc`. Reading a binding through these helpers means the compiler
 * checks the name against that declaration, so a binding renamed or dropped
 * in wrangler.jsonc fails `typecheck` rather than the request.
 */

/**
 * The worker's bindings, or `{}` when there is no Cloudflare runtime around
 * (a test process, a build-time module evaluation). `Partial` because that
 * empty case is real.
 *
 * `next dev` DOES have bindings — next.config.js calls
 * `initOpenNextCloudflareForDev`, which stands up miniflare against the local
 * `.wrangler/state`.
 */
export function cfEnv(): Partial<CloudflareEnv> {
  try {
    return getCloudflareContext().env
  } catch {
    // getCloudflareContext throws outside the Cloudflare runtime.
    return {}
  }
}

/** Binding names in `CloudflareEnv` that hold a plain string var or secret. */
type StringBinding = {
  [K in keyof CloudflareEnv]-?: NonNullable<CloudflareEnv[K]> extends string
    ? K
    : never
}[keyof CloudflareEnv]

/**
 * A string var or secret, preferring the binding and falling back to
 * `process.env` (so a plain Bun test process sees the root `.env`). Empty
 * string reads as absent.
 */
export function cfVar(name: StringBinding): string | undefined {
  // eslint-disable-next-line no-process-env
  const value = cfEnv()[name] ?? process.env[name]
  return value && value.length > 0 ? value : undefined
}
