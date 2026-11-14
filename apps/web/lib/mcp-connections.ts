import { desc, eq, schema } from '@app/db'

import type {
  McpClientVendor,
  McpConnection,
} from '@/components/settings/mcp-connections-section'

import { getDb } from './db'

/** Every OAuth client this user has approved, newest first. */
export async function listMcpConnections(
  userId: string,
): Promise<McpConnection[]> {
  const rows = await getDb()
    .select({
      id: schema.oauthConsent.id,
      name: schema.oauthClient.name,
      icon: schema.oauthClient.icon,
      uri: schema.oauthClient.uri,
      redirectUris: schema.oauthClient.redirectUris,
      createdAt: schema.oauthConsent.createdAt,
    })
    .from(schema.oauthConsent)
    .innerJoin(
      schema.oauthClient,
      eq(schema.oauthClient.clientId, schema.oauthConsent.clientId),
    )
    .where(eq(schema.oauthConsent.userId, userId))
    .orderBy(desc(schema.oauthConsent.createdAt))
  return rows.map(({ redirectUris, ...row }) => ({
    ...row,
    vendor: clientVendor(row.name, redirectUris),
    createdAt: row.createdAt?.toISOString() ?? null,
  }))
}

const VENDOR_HOSTS: Record<string, McpClientVendor> = {
  'claude.ai': 'claude',
  'claude.com': 'claude',
  'chatgpt.com': 'openai',
  'openai.com': 'openai',
}

/**
 * Which assistant a client is, for its logo. Clients self-register (DCR), so
 * this is a display hint, not an identity: the hosted apps are recognized by
 * their redirect URI, local ones (Claude Code, Codex — loopback redirects) by
 * name.
 */
function clientVendor(
  name: string | null,
  redirectUris: unknown,
): McpClientVendor | null {
  for (const uri of Array.isArray(redirectUris) ? redirectUris : []) {
    if (typeof uri !== 'string' || !URL.canParse(uri)) continue
    const host = new URL(uri).hostname
    for (const [domain, vendor] of Object.entries(VENDOR_HOSTS)) {
      if (host === domain || host.endsWith(`.${domain}`)) return vendor
    }
  }
  if (name && /\bclaude\b/i.test(name)) return 'claude'
  if (name && /\b(?:chatgpt|openai|codex)\b/i.test(name)) return 'openai'
  return null
}
