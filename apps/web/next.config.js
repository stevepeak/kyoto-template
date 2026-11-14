import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { withSentryConfig } from '@sentry/nextjs/config'

import { securityHeaders } from './security-headers.js'

// Build-time values (CI passes them to the web build; `next dev` falls back).
const isDev = process.env.NODE_ENV !== 'production'
const workflowsUrl =
  process.env.NEXT_PUBLIC_WORKFLOWS_URL ?? 'http://localhost:8787'
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_API_KEY
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  : undefined

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({ dev: isDev, workflowsUrl, posthogHost }),
      },
    ]
  },

  // Next.js won't serve `app/.well-known/*`, so the OAuth discovery documents
  // MCP clients look for are rewritten to Better Auth's handlers (the `mcp()`
  // plugin, via app/api/well-known for the two that need a URL rebuild) —
  // and, for the app MCP, to its own RFC 9728 metadata route.
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-protected-resource/api/mcp',
        destination: '/api/mcp/metadata',
      },
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        destination: '/api/auth/.well-known/oauth-protected-resource/:path*',
      },
      // Issuer-path and bare forms of both documents.
      {
        source:
          '/.well-known/:doc(oauth-authorization-server|openid-configuration)/:path*',
        destination: '/api/well-known/:doc',
      },
      {
        source:
          '/.well-known/:doc(oauth-authorization-server|openid-configuration)',
        destination: '/api/well-known/:doc',
      },
    ]
  },
}

// Bindings (D1, service bindings, email) in `next dev`. Persist to the same
// root `.wrangler/state` the workflows worker and `db:migrate:local` use, so
// all three see one local D1. Dev only: the `remote: true` bindings (AI,
// Vectorize, Browser) open a Cloudflare session, which `next build` in CI
// has no token for.
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev({
    persist: { path: '../../.wrangler/state/v3' },
  })
}

// Source maps upload only when SENTRY_AUTH_TOKEN (+ SENTRY_ORG,
// SENTRY_PROJECT) are set — CI for deploys; local builds skip it.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Browser events POST to this app's /monitoring, which forwards to Sentry:
  // same-origin for the CSP, and invisible to ad blockers.
  tunnelRoute: '/monitoring',
  telemetry: false,
})
