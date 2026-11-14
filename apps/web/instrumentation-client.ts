import * as Sentry from '@sentry/nextjs'

import { SENTRY_TRACES_SAMPLE_RATE, sentryEnabled } from './lib/sentry-options'

// Browser half of Sentry. `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time
// (CI passes it to the web build); without it nothing is sent.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: sentryEnabled(dsn),
  // Events go through this app's `/monitoring` route (`tunnelRoute` in
  // next.config.js): same-origin, so the CSP stays `connect-src 'self'` and
  // ad blockers don't drop them.
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  // Replays only around errors — none of ordinary sessions.
  // TODO: replays record the page; check your privacy policy covers it.
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
