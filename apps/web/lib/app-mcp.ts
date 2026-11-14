import { createCaller, type SessionUser } from '@app/api'
import { and, eq, schema } from '@app/db'
import { requireMcpAuth } from '@better-auth/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { getAuth } from './auth'
import { PRODUCT_NAME } from './brand'
import { getDb } from './db'
import {
  APP_MCP_PATH,
  APP_MCP_SCOPE,
  grantedScopes,
  resourceUrl,
} from './mcp-resources'
import { captureServerEvent } from './server-analytics'
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
const INSTRUCTIONS = `Tools for ${PRODUCT_NAME}, acting as the signed-in user. Call whoami first to learn who that is. Every tool takes an "intent" argument: say in one sentence why you are calling it.`

/**
 * What each tool is called and does. Shared with the MCP settings page, so the
 * list a user reads there is the list a client actually gets.
 */
export const APP_MCP_TOOLS = {
  whoami: {
    title: 'Who am I',
    description: 'The account this MCP connection is acting as.',
    readOnly: true,
  },
} as const

/**
 * Why a call was made, required on every app tool.
 *
 * The point is twofold: the user can read on Settings → MCP what their
 * assistant did and why, and every call lands in PostHog with its purpose
 * beside it, so we learn what assistants are used for rather than guessing
 * from tool names. It deliberately doesn't ask for the user's message: a
 * verbatim quote can hold anything they typed.
 *
 * Worded for the user because clients often show tool arguments in their
 * approval prompt.
 */
const intentInput = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe(
    'Why you are making this call: one sentence on what it is for in the task you are doing, written so the user could read it. Do not include anyone\'s name or contact details. E.g. "Check which account I am connected as before updating its settings."',
  )

/** One finished tool call, as the audit trail and PostHog record it. */
export type AppToolCall = {
  tool: string
  intent: string
  /** The tool's own arguments, `intent` removed. */
  arguments: Record<string, unknown>
  ok: boolean
  error: string | null
  durationMs: number
}

export type OnAppToolCall = (call: AppToolCall) => Promise<void>

type ToolName = keyof typeof APP_MCP_TOOLS

/**
 * Register one tool with the shared `intent` argument and call recording.
 *
 * `intent` is listed FIRST: models tend to fill arguments in order, so the
 * call states its purpose before it picks ids. It is split off before `run`
 * sees the arguments, so a reason can never leak into what a tool acts on.
 */
function registerAppTool<Shape extends z.ZodRawShape>(args: {
  server: McpServer
  onToolCall: OnAppToolCall
  name: ToolName
  input: Shape
  run: (input: z.infer<z.ZodObject<Shape>>) => Promise<unknown>
}) {
  const meta = APP_MCP_TOOLS[args.name]
  // Widened to the base shape: the SDK can't infer a callback type through
  // the generic `Shape`, and `run` is what carries the precise input type.
  const inputSchema: z.ZodRawShape = { intent: intentInput, ...args.input }
  args.server.registerTool(
    args.name,
    {
      title: meta.title,
      description: meta.description,
      inputSchema,
      annotations: { readOnlyHint: meta.readOnly },
    },
    async (raw): Promise<CallToolResult> => {
      const { intent, ...rest } = raw as { intent: string } & Record<
        string,
        unknown
      >
      const started = Date.now()
      let result: CallToolResult
      let error: string | null = null
      try {
        const value = await args.run(rest as z.infer<z.ZodObject<Shape>>)
        result = {
          content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        }
      } catch (err) {
        // Returned as content rather than thrown, so the model can read it.
        error = err instanceof Error ? err.message : String(err)
        result = { isError: true, content: [{ type: 'text', text: error }] }
      }
      await args.onToolCall({
        tool: args.name,
        intent,
        arguments: rest,
        ok: error === null,
        error,
        durationMs: Date.now() - started,
      })
      return result
    },
  )
}

/**
 * The app's MCP tools. Each goes through the tRPC caller, so a tool can do
 * exactly what the signed-in user could do in the web app — same
 * authorization, no second permission model.
 *
 * TODO: add the app's tools here (and to APP_MCP_TOOLS).
 */
function registerTools(
  server: McpServer,
  caller: Caller,
  onToolCall: OnAppToolCall,
) {
  registerAppTool({
    server,
    onToolCall,
    name: 'whoami',
    input: {},
    run: () => caller.me.whoami(),
  })
}

/** Build the MCP server for one caller. Exported for tests. */
export function createAppMcpServer(
  caller: Caller,
  onToolCall: OnAppToolCall = async () => {},
): McpServer {
  const server = new McpServer(
    { name: 'app', title: PRODUCT_NAME, version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  )
  registerTools(server, caller, onToolCall)
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
      const server = createAppMcpServer(caller, async (call) => {
        // Awaited, so the audit row exists by the time the client sees the
        // result. Never throws: a failed write must not fail the call.
        try {
          await db.insert(schema.auditEvent).values({
            id: crypto.randomUUID(),
            userId,
            type: 'mcp_tool_call',
            clientId,
            ...call,
            createdAt: new Date(),
          })
        } catch (err) {
          console.error('[mcp] audit write failed', err)
        }
        captureServerEvent({
          name: 'mcp_tool_called',
          props: {
            tool: call.tool,
            intent: call.intent,
            clientId,
            ok: call.ok,
            durationMs: call.durationMs,
          },
        })
      })
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
