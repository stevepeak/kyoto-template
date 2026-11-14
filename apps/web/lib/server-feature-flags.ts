import { z } from 'zod'

import { cfVar } from './cf-env'
import {
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type FeatureFlagValue,
  type FeatureFlagValues,
  resolveFeatureFlags,
} from './feature-flags'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

// The slice of PostHog's `/flags?v=2` response we read.
const flagsResponseSchema = z.object({
  flags: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      variant: z.string().nullish(),
    }),
  ),
})

/** Every declared flag at its default. */
function defaultFlags(): FeatureFlagValues {
  return resolveFeatureFlags(() => undefined)
}

/**
 * Every declared flag for one person, evaluated by PostHog in a single
 * request. Call once per request and read the flags you need from the result.
 *
 * `distinctId` must match what the browser identifies as for server and
 * client to agree — the signed-in user's id, if the app calls
 * `posthog.identify(user.id)`.
 *
 * Defaults when PostHog isn't configured, under `next dev` (local env files
 * may hold the production key — same rule as `captureServerEvent`), and on
 * any failure: a flag lookup must never fail the page that asked.
 *
 * @public
 */
export async function getFeatureFlags(args: {
  distinctId: string
}): Promise<FeatureFlagValues> {
  const apiKey = cfVar('POSTHOG_API_KEY')
  if (!apiKey || process.env.NODE_ENV === 'development') return defaultFlags()
  const host = (cfVar('POSTHOG_HOST') ?? DEFAULT_POSTHOG_HOST).replace(
    /\/+$/,
    '',
  )

  try {
    const res = await fetch(`${host}/flags?v=2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: args.distinctId,
        flag_keys_to_evaluate: Object.keys(FEATURE_FLAGS),
      }),
    })
    const parsed = flagsResponseSchema.safeParse(await res.json())
    if (!res.ok || !parsed.success) {
      console.error('[flags] unexpected response', res.status)
      return defaultFlags()
    }
    return resolveFeatureFlags((key) => {
      const flag = parsed.data.flags[key]
      // Unknown to PostHog → undefined → the declared default.
      if (!flag) return
      return flag.enabled ? (flag.variant ?? true) : false
    })
  } catch (err) {
    console.error('[flags] evaluation failed', err)
    return defaultFlags()
  }
}

/**
 * One flag for one person. Prefer `getFeatureFlags` when reading several —
 * each call here is a round trip to PostHog.
 *
 * @public
 */
export async function getFeatureFlag<K extends FeatureFlagKey>(args: {
  key: K
  distinctId: string
}): Promise<FeatureFlagValue<K>> {
  const flags = await getFeatureFlags({ distinctId: args.distinctId })
  return flags[args.key]
}
