import type { CloudflareOptions } from '@sentry/cloudflare'

// TODO: tune once you see real traffic — 10% of requests/steps traced.
const TRACES_SAMPLE_RATE = 0.1

/**
 * Sentry options for every class this Worker exports (the entrypoint, each
 * Workflow, each Durable Object). With no `SENTRY_DSN` secret the SDK stays
 * off. The release is the deployed version id (`CF_VERSION_METADATA`).
 */
export function sentryOptions(env: Env): CloudflareOptions {
  return {
    dsn: env.SENTRY_DSN,
    tracesSampleRate: TRACES_SAMPLE_RATE,
  }
}
