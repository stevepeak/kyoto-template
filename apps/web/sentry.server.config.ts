import * as Sentry from '@sentry/nextjs'

import { SENTRY_TRACES_SAMPLE_RATE, sentryEnabled } from './lib/sentry-options'

// On Workers this only sets `release`; the real server init (DSN, sampling)
// is `withSentry` in worker.ts. It matters for `next start` on Node, which
// skips the Worker entry.
const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: sentryEnabled(dsn),
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
})
