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
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface RunState<TOutput = unknown> {
  runId: string
  workflow: WorkflowName
  status: RunStatus
  progress: string[]
  output: TOutput | null
  error: string | null
}

/**
 * RPC surface the workflows worker exposes via service binding.
 * The web tRPC layer calls `env.WORKFLOWS.startRun(...)`.
 */
export interface WorkflowsRpc {
  startRun<N extends WorkflowName>(
    workflow: N,
    params: WorkflowInput<N>,
  ): Promise<StartRunResult>
}
