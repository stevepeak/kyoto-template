import { defineWfConfig } from '@stevepeak/007'

import {
  getDecider,
  listDecisionModels,
  listDecisionProviders,
} from './decider'
import { buildRunDeps, type HostDeps } from './deps'
import type { HostEnv } from './env'
import {
  fetchModelCatalog,
  fetchProviderBudget,
  getModel,
  listModels,
  listProviders,
} from './model'
import { toolRegistry } from './tools'
import { triggers } from './triggers'

/**
 * The single object the SDK consumes. Imported by both the web app (editor
 * model/tool/trigger lists, `/api/wf` data route) and the workflows Worker
 * (to run nodes).
 *
 * Keep `cloudflare:workers` out of this import graph — the web app imports it.
 */
export const wfConfig = defineWfConfig<HostDeps>({
  getModel,
  listModels,
  listProviders,
  fetchModelCatalog,
  fetchProviderBudget,
  // The SECOND kind of provider — TypeSafe's Jev on OpenRouter's Decisions API.
  // All three or none; `defineWfConfig` refuses a partial set. See `decider.ts`.
  getDecider,
  listDecisionModels,
  listDecisionProviders,
  toolRegistry,
  triggers,
  buildRunDeps,
  resolveConnectorSecret: ({ env }) => {
    return (env as HostEnv | undefined)?.WF_CONNECTOR_KEY
  },
  // TODO: optional hooks — onRunComplete/onRunFailed (reflect outcomes onto
  // app rows), resolveTelemetry (Analytics Engine). `resolveBlobRef` defaults to
  // reading the UPLOADS bucket, where 007's `extract_text` spills.
})
