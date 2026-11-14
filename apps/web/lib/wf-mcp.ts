import { eq, schema } from '@app/db'
import { requireMcpAuth } from '@better-auth/mcp'
import {
  createLocalWfDataClient,
  createWfMcpHandler,
} from '@stevepeak/007/server'

import { getAuth } from './auth'
import { getDb } from './db'
import {
  grantedScopes,
  resourceUrl,
  WF_MCP_PATH,
  WF_MCP_SCOPES,
} from './mcp-resources'
import { canUseWorkflows } from './wf-access'
import { wfSdkOptions } from './wf-handler-options'

type AccessTokenClaims = { sub?: unknown; scope?: unknown; scp?: unknown }

/** The token's subject, re-checked against the console's access rule. */
async function resolveUserId(claims: AccessTokenClaims): Promise<string> {
  const userId = typeof claims.sub === 'string' ? claims.sub : null
  if (!userId) throw new Error('Access token carries no subject')
  const [row] = await getDb()
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)
  if (!canUseWorkflows(row?.email)) {
    throw new Error('Not authorized to use the workflow MCP')
  }
  return userId
}

/**
 * 007's MCP server behind this app's OAuth. Both routes share ONE resource
 * (`/api/wf/mcp`); `/write` only differs by requiring `wf:write`, and the
 * handler declines to register write tools without that scope.
 */
export function createWfMcpRoute(requiredScopes: readonly string[]) {
  return async (req: Request): Promise<Response> => {
    return await requireMcpAuth(
      getAuth(),
      async (request, claims: AccessTokenClaims) => {
        const userId = await resolveUserId(claims)
        const write = grantedScopes(claims).has(WF_MCP_SCOPES.write)
        const client = createLocalWfDataClient(wfSdkOptions, {
          ctx: { userId, source: 'mcp' },
          req: request,
        })
        return await createWfMcpHandler({ client, write })(request)
      },
      {
        resource: resourceUrl(WF_MCP_PATH),
        requiredScopes: [...requiredScopes],
      },
    )(req)
  }
}
