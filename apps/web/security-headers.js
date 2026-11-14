// Response headers for every route (`headers()` in next.config.js). Plain JS
// because next.config.js imports it at build time.

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

/** `https://host` → `wss://host`, so the browser may open the run WebSocket. */
function toWebSocketOrigin(origin) {
  return origin.replace(/^http/, 'ws')
}

/**
 * PostHog's API host plus the asset host it lazy-loads extensions from
 * (`us.i.posthog.com` → `us-assets.i.posthog.com`).
 */
function posthogOrigins(host) {
  try {
    const url = new URL(host)
    const assets = url.hostname.replace(/^([a-z]+)\.i\./, '$1-assets.i.')
    return [url.origin, `${url.protocol}//${assets}`]
  } catch {
    return []
  }
}

/**
 * Content-Security-Policy for this app.
 *
 * Scripts allow `'unsafe-inline'` because Next's App Router hydrates through
 * inline `<script>` tags; locking that down needs a per-request nonce set in
 * proxy.ts, which also forces every page to render dynamically.
 * TODO: switch to nonces if you need a strict script-src.
 *
 * @param {{ dev: boolean, workflowsUrl: string, posthogHost?: string }} opts
 */
export function contentSecurityPolicy({ dev, workflowsUrl, posthogHost }) {
  const workflows = new URL(workflowsUrl).origin
  const posthog = posthogHost ? posthogOrigins(posthogHost) : []

  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      // React's dev build evaluates code for fast refresh / stack traces.
      ...(dev ? ["'unsafe-eval'"] : []),
      TURNSTILE_ORIGIN,
      ...posthog,
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Avatars can be remote (Google profile photos); `data:`/`blob:` for
    // previews before upload.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    // Sentry is same-origin via the `/monitoring` tunnel, so not listed.
    'connect-src': [
      "'self'",
      workflows,
      toWebSocketOrigin(workflows),
      TURNSTILE_ORIGIN,
      ...posthog,
      // Next's dev server pushes HMR over a WebSocket.
      ...(dev ? ['ws:'] : []),
    ],
    'frame-src': [TURNSTILE_ORIGIN],
    // Sentry Replay compresses in a blob: worker.
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // Nobody may frame the app — clickjacking on the OAuth consent screen
    // would hand out MCP access.
    'frame-ancestors': ["'none'"],
  }

  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${[...new Set(values)].join(' ')}`,
  )
  if (!dev) policy.push('upgrade-insecure-requests')
  return policy.join('; ')
}

/**
 * @param {{ dev: boolean, workflowsUrl: string, posthogHost?: string }} opts
 * @returns {{ key: string, value: string }[]}
 */
export function securityHeaders(opts) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(opts) },
    // Two years. Not `includeSubDomains`/`preload`: those bind every
    // subdomain of the zone to HTTPS too — decide that for the whole domain.
    // TODO: add includeSubDomains (and preload) once every subdomain is HTTPS.
    ...(opts.dev
      ? []
      : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Legacy twin of `frame-ancestors 'none'` for old browsers.
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    },
  ]
}
