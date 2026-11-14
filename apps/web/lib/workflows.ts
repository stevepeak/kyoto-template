import type {
  StartRunResult,
  TriggeredRunOpts,
  WorkflowName,
  WorkflowsRpc,
} from '@app/workflows-client'
import type {
  StartGraphRunInput,
  StartGraphRunResult,
} from '@stevepeak/007/engine'

import { cfEnv } from './cf-env'

/**
 * Returns the workflows RPC client.
 *
 * - In prod (and `wrangler dev`) we use the Cloudflare service binding —
 *   it's typed, in-process, and authenticated by platform identity.
 * - In `next dev` the binding may not be wired; fall back to a direct HTTP
 *   call against the locally-running workflows worker.
 */
export function getWorkflowsClient(): WorkflowsRpc {
  const binding = cfEnv().WORKFLOWS
  if (binding && typeof binding.startRun === 'function') {
    return binding
  }

  /* eslint-disable no-process-env */
  return new HttpWorkflowsClient(
    process.env.WORKFLOWS_URL ?? 'http://localhost:8787',
    process.env.WORKFLOWS_SHARED_SECRET,
  )
  /* eslint-enable no-process-env */
}

class HttpWorkflowsClient implements WorkflowsRpc {
  constructor(
    private readonly baseUrl: string,
    private readonly sharedSecret: string | undefined,
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.sharedSecret
          ? { authorization: `Bearer ${this.sharedSecret}` }
          : {}),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`workflows worker returned ${res.status} for ${path}`)
    }
    return await res.json<T>()
  }

  async startRun(
    workflow: WorkflowName,
    params: unknown,
  ): Promise<StartRunResult> {
    return await this.post('/runs', { workflow, params })
  }

  async startTriggeredRun(
    triggerKind: string,
    triggerInput: unknown,
    opts?: TriggeredRunOpts,
  ): Promise<StartGraphRunResult> {
    return await this.post('/triggered-runs', {
      triggerKind,
      triggerInput,
      opts,
    })
  }

  async startGraphRun(input: StartGraphRunInput): Promise<StartGraphRunResult> {
    return await this.post('/graph-runs', input)
  }

  async startEvalSweep(input: {
    evalRunId: string
  }): Promise<{ started: boolean }> {
    return await this.post('/eval-sweeps', input)
  }
}
