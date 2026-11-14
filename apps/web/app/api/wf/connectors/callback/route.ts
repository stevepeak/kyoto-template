import { createWfConnectorCallback } from '@stevepeak/007/server'

import { getAuth } from '@/lib/auth'
import { cfVar } from '@/lib/cf-env'
import { canUseWorkflows } from '@/lib/wf-access'
import { getWfDb } from '@/lib/wf-handler-options'

/**
 * The MCP-connector OAuth redirect target. The path is registered with each
 * authorization server as the redirect URI, so it must match
 * `connectorCallbackPath` in lib/wf-handler-options.ts exactly. Gated like the
 * editor — this route stores a credential.
 */
export const GET = createWfConnectorCallback({
  resolveDb: getWfDb,
  resolveContext: async (req) => {
    const session = await getAuth().api.getSession({ headers: req.headers })
    const userId = session?.user?.id
    if (!userId || !canUseWorkflows(session.user.email)) {
      throw new Error('Unauthorized')
    }
    return { userId }
  },
  resolveSecret: () => cfVar('WF_CONNECTOR_KEY'),
  defaultReturnTo: '/workflows/connectors',
})
