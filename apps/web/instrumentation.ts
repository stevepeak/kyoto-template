import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}

// Server Components, route handlers and the proxy report through this.
export const onRequestError = Sentry.captureRequestError
