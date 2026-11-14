import { runScopeFromContext, wfConfig } from '@app/wf-host'
import { startGraphRun } from '@stevepeak/007/cloudflare'
import { createLocalWfDataClient } from '@stevepeak/007/server'
import { createWfDb } from '@stevepeak/007/storage'

/**
 * A `WfDataClient` for the eval sweep workflow's own process.
 *
 * Deliberately not the web app's `wfSdkOptions`: that carries cookie auth and
 * the editor playgrounds, none of which mean anything here. What a sweep needs
 * is narrow — the model seam for judges, the wf database, and a way to start a
 * run — and this Worker has all three locally. Only users who pass the web
 * Worker's `resolveContext` can launch a sweep.
 */
export function createEvalSweepClient(env: Env) {
  return createLocalWfDataClient(
    {
      config: wfConfig,
      resolveDb: () => createWfDb(env.WF_DB),
      resolveContext: () => ({ source: 'system' as const }),
      resolveEnv: () => env,
      startEvalRun: async ({
        workflowVersionId,
        triggerKind,
        triggerInput,
        promptVariables,
        fixtures,
        liveReads,
        toolModes,
        modelId,
        promptBody,
        configOverride,
        executionOverride,
        context,
        sweepNotice,
      }) => {
        const started = await startGraphRun(env, {
          workflowVersionId,
          triggerKind,
          triggerInput,
          promptVariables,
          ...runScopeFromContext(context),
          simulate: true,
          isEval: true,
          fixtures,
          liveReads,
          toolModes,
          executionOverride,
          agentOverride:
            modelId || promptBody || configOverride
              ? { modelId, prompt: promptBody, config: configOverride }
              : undefined,
          sweepNotice,
        })
        return { wfRunId: started.workflowRunId }
      },
    },
    {
      ctx: { source: 'system' },
      req: new Request('https://workflows.internal/eval-sweep'),
    },
  )
}
