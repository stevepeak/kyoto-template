import type {
  StartRunResult,
  WorkflowName,
  WorkflowsRpc,
} from '@app/workflows-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Returns the workflows RPC client.
 *
 * - In prod (and `wrangler dev`) we use the Cloudflare service binding —
 *   it's typed, in-process, and authenticated by platform identity.
 * - In `next dev` (Turbopack) the binding may not be wired; fall back to a
 *   direct HTTP call against the locally-running workflows worker.
 */
export function getWorkflowsClient(): WorkflowsRpc {
  try {
    const cf = getCloudflareContext()
    const binding = (cf?.env as { WORKFLOWS?: WorkflowsRpc } | undefined)
      ?.WORKFLOWS
    if (binding && typeof binding.startRun === 'function') {
      return binding
    }
  } catch {
    // getCloudflareContext throws when called outside the Cloudflare runtime
    // — that's fine, we'll use the HTTP fallback below.
  }

  return new HttpWorkflowsClient(
    // eslint-disable-next-line no-process-env
    process.env.WORKFLOWS_URL ?? 'http://localhost:8787',
  )
}

class HttpWorkflowsClient implements WorkflowsRpc {
  constructor(private readonly baseUrl: string) {}

  async startRun(
    workflow: WorkflowName,
    params: unknown,
  ): Promise<StartRunResult> {
    const res = await fetch(`${this.baseUrl}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow, params }),
    })
    if (!res.ok) {
      throw new Error(`workflows worker returned ${res.status}`)
    }
    return (await res.json()) as StartRunResult
  }
}
