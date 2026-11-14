'use client'

import posthog from 'posthog-js'
import { useEffect, useState } from 'react'

import {
  type FeatureFlagKey,
  type FeatureFlagValue,
  parseFeatureFlag,
} from '@/lib/feature-flags'

/**
 * A PostHog feature flag in the browser, typed by its declaration in
 * `lib/feature-flags.ts`. The declared default until PostHog has loaded flags
 * — and always outside production, where `PostHogProvider` doesn't start
 * PostHog — then live, re-rendering when flags reload (e.g. after `identify`).
 *
 * @public
 */
export function useFeatureFlag<K extends FeatureFlagKey>(
  key: K,
): FeatureFlagValue<K> {
  const [raw, setRaw] = useState<unknown>(undefined)

  // Registering before `posthog.init` is fine: the handler waits for the
  // first flag load.
  useEffect(
    () => posthog.onFeatureFlags(() => setRaw(posthog.getFeatureFlag(key))),
    [key],
  )

  return parseFeatureFlag({ key, raw })
}
