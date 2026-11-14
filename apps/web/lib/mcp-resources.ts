import { cfEnv } from './cf-env'

/**
 * OAuth protected resources — the two MCP servers this app exposes. Each is
 * its own resource so a token is audience-bound to one URL and can never be
 * replayed against the other.
 *
 *   /api/mcp     the app's own MCP (`whoami`, …) — see lib/app-mcp.ts
 *   /api/wf/mcp  007's workflow MCP (read; `/write` adds the write tools)
 */
export const APP_MCP_PATH = '/api/mcp'
export const WF_MCP_PATH = '/api/wf/mcp'

// TODO: rename the app scope to something product-specific (it is shown on
// the consent screen).
export const APP_MCP_SCOPE = 'app'

/**
 * 007 scopes. `wf:write` is a SEPARATE grant with its own consent prompt; the
 * MCP route declines to even register the write tools without it.
 */
export const WF_MCP_SCOPES = { read: 'wf:read', write: 'wf:write' } as const

/** Every scope this authorization server will issue. */
export const OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  WF_MCP_SCOPES.read,
  WF_MCP_SCOPES.write,
  APP_MCP_SCOPE,
] as const

/**
 * The origin this deployment was explicitly configured with, or undefined.
 *
 * `process.env.APP_URL` can be an EMPTY STRING (Next bakes a missing build-time
 * value in as `''`), hence the truthiness check. It is deliberately NOT read
 * from the Cloudflare env: wrangler.jsonc sets the PRODUCTION origin there and
 * `next dev` loads those same vars, so local sign-in would fail with
 * "Invalid origin".
 */
export function configuredAppUrl(): string | undefined {
  // eslint-disable-next-line no-process-env
  const value = process.env.APP_URL
  return value ? value.replace(/\/+$/, '') : undefined
}

/** An absolute URL on this deployment's origin, for a resource identifier. */
export function resourceUrl(path: string): string {
  const configured = configuredAppUrl()
  if (configured) return `${configured}${path}`
  // A deployed Worker still has the authoritative origin as a wrangler var.
  // Gated on NODE_ENV so `next dev` stays on loopback (see configuredAppUrl).
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'production') {
    const appUrl = cfEnv().APP_URL
    if (appUrl) return `${appUrl.replace(/\/+$/, '')}${path}`
  }
  return `http://localhost:3000${path}`
}

/**
 * Is this a resource identifier the OAuth provider will accept?
 *
 * `mcp()` throws on anything that is not an absolute URL, and it throws where
 * the auth instance is CONSTRUCTED — so a bad value would break signing in,
 * not just the MCP. Checking here lets the plugin be left out instead.
 */
export function isUsableResource(resource: string): boolean {
  try {
    const url = new URL(resource)
    return (
      url.protocol === 'https:' ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
    )
  } catch {
    return false
  }
}

/** Scopes on a verified token's claims (`scope` string or `scp` array). */
export function grantedScopes(claims: {
  scope?: unknown
  scp?: unknown
}): Set<string> {
  const raw = claims.scope ?? claims.scp
  if (typeof raw === 'string') return new Set(raw.split(' ').filter(Boolean))
  if (Array.isArray(raw)) {
    return new Set(raw.filter((s): s is string => typeof s === 'string'))
  }
  return new Set()
}
