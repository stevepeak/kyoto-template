import type {
  StartGraphRunInput,
  StartGraphRunResult,
} from '@stevepeak/007/engine'
import { z } from 'zod'

/**
 * Workflow input schemas — the single source of truth for what each workflow
 * accepts. Imported on the worker (to validate incoming payloads) and by the
 * web app (to type the tRPC mutation inputs).
 */
export const workflowInputs = {
  'hello-world': z.object({
    name: z.string().optional(),
  }),
  'example-agent': z.object({
    name: z.string().optional(),
  }),
  'drip-email': z.object({
    userId: z.string(),
    email: z.string().email(),
  }),
  'nightly-cleanup': z.object({}).optional(),
} as const

export type WorkflowName = keyof typeof workflowInputs
export type WorkflowInput<N extends WorkflowName> = z.infer<
  (typeof workflowInputs)[N]
>

/** Shape returned by the worker after starting a run. */
export interface StartRunResult {
  runId: string
  accessToken: string
}

/** Run status surfaced to the client. */
export type RunStatus =
  'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface RunState<TOutput = unknown> {
  runId: string
  workflow: WorkflowName
  status: RunStatus
  progress: string[]
  output: TOutput | null
  error: string | null
}

/**
 * 007 run options for `startTriggeredRun`. Identity is opaque to the worker:
 * `correlationId` carries the data scope, `subjectId` the entity the run is
 * about (see @app/wf-host `buildRunDeps`).
 */
export interface TriggeredRunOpts {
  subjectId?: string
  correlationId?: string
  promptVariables?: Record<string, string | undefined>
}

/**
 * RPC surface the workflows worker exposes via service binding.
 * The web tRPC layer calls `env.WORKFLOWS.startRun(...)`.
 *
 * The 007 methods take the SDK's OWN types (`/engine` has no Cloudflare or DB
 * imports precisely so a service boundary can be typed with them) — don't
 * restate them here.
 */
export interface WorkflowsRpc {
  /** Start one of the example Cloudflare Workflows in apps/workflows. */
  startRun<N extends WorkflowName>(
    workflow: N,
    params: WorkflowInput<N>,
  ): Promise<StartRunResult>
  /** 007: start the workflow version assigned to an event trigger. */
  startTriggeredRun(
    triggerKind: string,
    triggerInput: unknown,
    opts?: TriggeredRunOpts,
  ): Promise<StartGraphRunResult>
  /** 007: start a specific authored version (backs the SDK's `retryRun`). */
  startGraphRun(input: StartGraphRunInput): Promise<StartGraphRunResult>
  /** 007: start (or restart) the workflow that runs an eval sweep. */
  startEvalSweep(input: { evalRunId: string }): Promise<{ started: boolean }>
}
