import { type HostDeps, runScopeFromContext, wfConfig } from '@app/wf-host'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  type CreateWfSdkHandlersOptions,
  executeAgentPreview,
  executeToolPreview,
  UnauthorizedError,
} from '@stevepeak/007/server'
import { assertWfSchema, createWfDb } from '@stevepeak/007/storage'

import { getAuth } from './auth'
import { cfEnv, cfVar } from './cf-env'
import { canUseWorkflows } from './wf-access'
import { getWorkflowsClient } from './workflows'

export function getWfDb() {
  const d1 = cfEnv().WF_DB
  if (!d1) {
    throw new Error(
      'WF_DB (D1) binding is not available. Run `bun run db:migrate:local` and start via `next dev`.',
    )
  }
  return createWfDb(d1)
}

// Dev-only: fail with a clear message when 007's migrations haven't been
// applied, instead of an empty editor. Checked once per process.
let schemaChecked: Promise<void> | undefined
function ensureSchema(db: ReturnType<typeof getWfDb>): Promise<void> {
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'production') return Promise.resolve()
  return (schemaChecked ??= assertWfSchema(db))
}

/** Connector deps for the in-process playgrounds; unset key = no connectors. */
function connectorPreviewDeps() {
  const secret = cfVar('WF_CONNECTOR_KEY')
  return secret ? { db: getWfDb(), secret } : undefined
}

/**
 * Everything `/api/wf` (and the 007 MCP) needs from the host. See
 * packages/007/guide.md for each option.
 */
export const wfSdkOptions = {
  config: wfConfig,
  resolveDb: async () => {
    const db = getWfDb()
    await ensureSchema(db)
    return db
  },
  resolveContext: async (req) => {
    const session = await getAuth().api.getSession({ headers: req.headers })
    const userId = session?.user?.id
    if (!userId || !canUseWorkflows(session.user.email)) {
      throw new UnauthorizedError('Unauthorized')
    }
    return { userId }
  },
  connectorCallbackPath: '/api/wf/connectors/callback',
  resolveEnv: () => getCloudflareContext().env,
  waitUntil: (promise) => {
    getCloudflareContext().ctx.waitUntil(promise)
  },
  // TODO: `resolveAnalytics` for the telemetry dashboard (needs a
  // WF_TELEMETRY Analytics Engine dataset + CF_ANALYTICS_TOKEN).

  // Durable runs live on the workflows Worker — delegate over the binding.
  retryRun: async ({ mode, source }) => {
    const resume = mode === 'resume'
    const started = await getWorkflowsClient().startGraphRun({
      workflowVersionId: resume
        ? source.originalVersionId
        : (source.latestVersionId ?? source.originalVersionId),
      triggerKind: source.triggerKind,
      triggerInput: source.triggerInput,
      subjectId: source.subjectId ?? undefined,
      correlationId: source.correlationId ?? undefined,
      resumeFromRunId: resume ? source.runId : undefined,
    })
    return { runId: started.workflowRunId }
  },
  startEvalSweep: async (input) => {
    return await getWorkflowsClient().startEvalSweep(input)
  },

  // Playgrounds run in-process here, with this Worker's bindings.
  runAgentPreview: async ({
    config,
    input,
    promptVariables,
    liveToolIds,
    messages,
    context,
  }) => {
    return await executeAgentPreview({
      config,
      input,
      messages,
      liveToolIds,
      wfConfig,
      connectors: connectorPreviewDeps(),
      runContext: {
        triggerKind: 'playground',
        promptVariables,
        ...runScopeFromContext(context),
        env: getCloudflareContext().env,
      },
    })
  },
  runToolPreview: async ({ toolId, args, context }) => {
    return await executeToolPreview({
      toolId,
      args,
      wfConfig,
      connectors: connectorPreviewDeps(),
      runContext: {
        triggerKind: 'playground',
        ...runScopeFromContext(context),
        env: getCloudflareContext().env,
      },
    })
  },
  // The identity fields the playgrounds collect — must match the keys
  // `runScopeFromContext` (@app/wf-host) reads. TODO: rename with run-scope.ts.
  toolContextFields: [
    {
      key: 'scopeId',
      label: 'Scope',
      description: 'Data scope for this run (RunContext.correlationId).',
      placeholder: 'scope id',
    },
    {
      key: 'subjectId',
      label: 'Subject',
      description: 'The entity this run is about (RunContext.subjectId).',
      placeholder: 'subject id',
    },
  ],
} satisfies CreateWfSdkHandlersOptions<HostDeps>
