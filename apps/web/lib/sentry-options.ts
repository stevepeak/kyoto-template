// Shared Sentry settings for every runtime the web app runs in: the browser
// (`instrumentation-client.ts`), the Worker (`worker.ts`) and `next dev`'s
// Node server (`sentry.server.config.ts`). Each passes its own DSN — the
// browser's is inlined at build time, the Worker's is a secret.

// TODO: tune sampling once you see real traffic — 10% of requests traced.
export const SENTRY_TRACES_SAMPLE_RATE = 0.1

/**
 * Off unless a DSN is set, and never from `next dev` — local errors belong in
 * the terminal, not in the production project's issue stream.
 */
export function sentryEnabled(dsn: string | undefined): boolean {
  return Boolean(dsn) && process.env.NODE_ENV === 'production'
}
