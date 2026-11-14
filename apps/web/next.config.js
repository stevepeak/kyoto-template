import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

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
// all three see one local D1.
initOpenNextCloudflareForDev({
  persist: { path: '../../.wrangler/state/v3' },
})

export default nextConfig
