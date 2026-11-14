/**
 * Every PostHog feature flag the app reads, with the value to use when PostHog
 * isn't configured, is unreachable, or doesn't know the flag. Safe to import
 * from client and server code alike.
 *
 * Add a flag here first, then create it in PostHog under the same key —
 * `useFeatureFlag` (browser) and `getFeatureFlag` (server) only accept keys
 * listed here, and return the type declared here.
 */
export const FEATURE_FLAGS = {
  // TODO: replace these examples with the app's real flags.
  'example-flag': { kind: 'boolean', default: false },
  'example-experiment': {
    kind: 'variant',
    variants: ['control', 'test'],
    default: 'control',
  },
} as const satisfies Record<string, FlagSpec>

type FlagSpec =
  | { kind: 'boolean'; default: boolean }
  | { kind: 'variant'; variants: readonly string[]; default: string }

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

type Spec<K extends FeatureFlagKey> = (typeof FEATURE_FLAGS)[K]

/** `boolean` for an on/off flag; the union of its variants for a multivariate one. */
export type FeatureFlagValue<K extends FeatureFlagKey> =
  Spec<K> extends { kind: 'variant'; variants: readonly (infer V)[] }
    ? V
    : boolean

export type FeatureFlagValues = {
  [K in FeatureFlagKey]: FeatureFlagValue<K>
}

/**
 * Turns what PostHog returned for a flag (`true`/`false`, a variant string,
 * or nothing) into the declared type — the default when it doesn't fit, e.g.
 * a variant PostHog has that this code doesn't know.
 */
export function parseFeatureFlag<K extends FeatureFlagKey>(args: {
  key: K
  raw: unknown
}): FeatureFlagValue<K> {
  const spec: FlagSpec = FEATURE_FLAGS[args.key]
  const value =
    spec.kind === 'boolean'
      ? typeof args.raw === 'boolean'
        ? args.raw
        : spec.default
      : typeof args.raw === 'string' && spec.variants.includes(args.raw)
        ? args.raw
        : spec.default
  return value as FeatureFlagValue<K>
}

/** Every declared flag, each parsed from what `lookup` returns for its key. */
export function resolveFeatureFlags(
  lookup: (key: FeatureFlagKey) => unknown,
): FeatureFlagValues {
  const keys = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]
  // `fromEntries` can't carry a per-key type; `parseFeatureFlag` guarantees it.
  return Object.fromEntries(
    keys.map((key) => [key, parseFeatureFlag({ key, raw: lookup(key) })]),
  ) as unknown as FeatureFlagValues
}
