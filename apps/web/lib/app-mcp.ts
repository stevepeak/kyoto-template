import { createCaller, type SessionUser } from '@app/api'
import { and, eq, schema } from '@app/db'
import { requireMcpAuth } from '@better-auth/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import { getAuth } from './auth'
import { PRODUCT_NAME } from './brand'
import { getDb } from './db'
import {
  APP_MCP_PATH,
  APP_MCP_SCOPE,
  grantedScopes,
  resourceUrl,
} from './mcp-resources'
import { getWorkflowsClient } from './workflows'

type Caller = ReturnType<typeof createCaller>

type AccessTokenClaims = {
  sub?: unknown
  azp?: unknown
  scope?: unknown
  scp?: unknown
}

// TODO: describe the product to the model — what it is and when to use which
// tool.
const INSTRUCTIONS = `Tools for ${PRODUCT_NAME}, acting as the signed-in user. Call whoami first to learn who that is.`

/**
 * The app's MCP tools. Each goes through the tRPC caller, so a tool can do
 * exactly what the signed-in user could do in the web app — same
 * authorization, no second permission model.
 *
 * TODO: add the app's tools here.
 */
function registerTools(server: McpServer, caller: Caller) {
  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description: 'The account this MCP connection is acting as.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => await asContent(() => caller.me.whoami()),
  )
}

/** A tool result as JSON text; a thrown error as content the model can read. */
async function asContent(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await run()
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { isError: true, content: [{ type: 'text', text: message }] }
  }
}

/** Build the MCP server for one caller. Exported for tests. */
export function createAppMcpServer(caller: Caller): McpServer {
  const server = new McpServer(
    { name: 'app', title: PRODUCT_NAME, version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  )
  registerTools(server, caller)
  return server
}

/**
 * Does a stored consent still grant the app MCP? The plugin JSON-encodes the
 * scope list before writing it into a Drizzle `json` column, so it reads back
 * as a JSON *string* — parse it once more.
 */
export function consentGrantsAppMcp(stored: unknown): boolean {
  let scopes = stored
  if (typeof scopes === 'string') {
    try {
      scopes = JSON.parse(scopes)
    } catch {
      return false
    }
  }
  return Array.isArray(scopes) && scopes.includes(APP_MCP_SCOPE)
}

/** A JSON-RPC error body, for a verified token that may not use the MCP. */
function rpcError(status: number, message: string): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message }, id: null },
    { status },
  )
}

/** The POST handler for /api/mcp. */
export async function handleAppMcpRequest(req: Request): Promise<Response> {
  return await requireMcpAuth(
    getAuth(),
    async (request, claims: AccessTokenClaims) => {
      const userId = typeof claims.sub === 'string' ? claims.sub : null
      if (!userId) return rpcError(401, 'Access token carries no subject')
      if (!grantedScopes(claims).has(APP_MCP_SCOPE)) {
        return rpcError(403, `Missing the "${APP_MCP_SCOPE}" scope`)
      }

      const db = getDb()
      const [row] = await db
        .select({
          id: schema.user.id,
          email: schema.user.email,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1)
      if (!row) return rpcError(401, 'Unknown account')

      // The JWT verifies offline, so a client whose consent was revoked would
      // keep working until its token expired. Re-check the consent row.
      const clientId = typeof claims.azp === 'string' ? claims.azp : null
      if (!clientId) return rpcError(401, 'Access token carries no client')
      const consents = await db
        .select({ scopes: schema.oauthConsent.scopes })
        .from(schema.oauthConsent)
        .where(
          and(
            eq(schema.oauthConsent.userId, userId),
            eq(schema.oauthConsent.clientId, clientId),
          ),
        )
      if (!consents.some((c) => consentGrantsAppMcp(c.scopes))) {
        return rpcError(401, 'This client has been disconnected')
      }

      const user: SessionUser = { ...row, name: row.name ?? null }
      const caller = createCaller({
        db,
        user,
        workflows: getWorkflowsClient(),
      })
      // Stateless with a JSON response: a Worker isolate cannot hold an MCP
      // session between requests.
      const server = createAppMcpServer(caller)
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      })
      await server.connect(transport)
      try {
        return await transport.handleRequest(request)
      } finally {
        await transport.close()
      }
    },
    { resource: resourceUrl(APP_MCP_PATH), requiredScopes: [APP_MCP_SCOPE] },
  )(req)
}

/**
 * RFC 9728 protected resource metadata for /api/mcp. Better Auth's `mcp()`
 * plugin publishes this document for its primary resource (the 007 MCP) only,
 * so the app MCP serves its own — next.config.js rewrites
 * `/.well-known/oauth-protected-resource/api/mcp` here.
 */
export function appMcpResourceMetadata() {
  const resource = resourceUrl(APP_MCP_PATH)
  return {
    resource,
    resource_name: PRODUCT_NAME,
    authorization_servers: [`${new URL(resource).origin}/api/auth`],
    bearer_methods_supported: ['header'],
    scopes_supported: [APP_MCP_SCOPE],
  }
}
