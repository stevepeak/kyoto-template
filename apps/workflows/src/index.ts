import {
  type StartRunResult,
  workflowInputs,
  type WorkflowName,
  type WorkflowsRpc,
} from '@app/workflows-client'
import { WorkerEntrypoint } from 'cloudflare:workers'

import { signRunToken, verifyRunToken } from './auth'
import { handleNotificationsBatch } from './queues/notifications'

export { RunRoom } from './durable-objects/run-room'
export { HelloWorld } from './workflows/hello-world'
export { ExampleAgent } from './workflows/example-agent'
export { DripEmail } from './workflows/drip-email'
export { NightlyCleanup } from './workflows/nightly-cleanup'

function bindingFor(env: Env, name: WorkflowName): Workflow {
  switch (name) {
    case 'hello-world':
      return env.HELLO_WORLD
    case 'example-agent':
      return env.EXAMPLE_AGENT
    case 'drip-email':
      return env.DRIP_EMAIL
    case 'nightly-cleanup':
      return env.NIGHTLY_CLEANUP
  }
}

async function startRun(
  env: Env,
  workflow: WorkflowName,
  params: unknown,
): Promise<StartRunResult> {
  const parsed = workflowInputs[workflow].parse(params ?? {})
  const runId = crypto.randomUUID()

  const room = env.RUN_ROOM.get(env.RUN_ROOM.idFromName(runId))
  await room.init(workflow)

  await bindingFor(env, workflow).create({
    id: runId,
    params: { ...parsed, runId },
  })

  const accessToken = await signRunToken(runId, env.TOKEN_SIGNING_KEY)
  return { runId, accessToken }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Service-binding RPC entrypoint. Called from the web Worker:
 *
 *   const handle = await env.WORKFLOWS.startRun('example-agent', { name })
 */
export default class WorkflowsService
  extends WorkerEntrypoint<Env>
  implements WorkflowsRpc
{
  async startRun(
    workflow: WorkflowName,
    params: unknown,
  ): Promise<StartRunResult> {
    return await startRun(this.env, workflow, params)
  }

  /**
   * Browser-facing HTTP surface — SSE stream, WebSocket, status polling,
   * and a public `POST /runs` for cases where service bindings aren't wired.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const env = this.env

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // POST /runs  — public start endpoint (mainly for local dev / fallback)
    if (url.pathname === '/runs' && request.method === 'POST') {
      const body = (await request.json()) as {
        workflow: WorkflowName
        params?: unknown
      }
      const result = await startRun(env, body.workflow, body.params)
      return Response.json(result, { headers: corsHeaders })
    }

    // GET /runs/:id  — status snapshot
    const statusMatch = url.pathname.match(/^\/runs\/([^/]+)$/)
    if (statusMatch && request.method === 'GET') {
      const runId = statusMatch[1]
      if (!(await authorize(url, runId, env))) {
        return new Response('unauthorized', { status: 401 })
      }
      const room = env.RUN_ROOM.get(env.RUN_ROOM.idFromName(runId))
      return Response.json(await room.getState(runId), { headers: corsHeaders })
    }

    // GET /runs/:id/stream  — SSE stream
    const streamMatch = url.pathname.match(/^\/runs\/([^/]+)\/stream$/)
    if (streamMatch && request.method === 'GET') {
      const runId = streamMatch[1]
      if (!(await authorize(url, runId, env))) {
        return new Response('unauthorized', { status: 401 })
      }
      return openSseStream(env, runId)
    }

    // GET /runs/:id/ws  — WebSocket upgrade
    const wsMatch = url.pathname.match(/^\/runs\/([^/]+)\/ws$/)
    if (wsMatch) {
      const runId = wsMatch[1]
      if (!(await authorize(url, runId, env))) {
        return new Response('unauthorized', { status: 401 })
      }
      const id = env.RUN_ROOM.idFromName(runId)
      return env.RUN_ROOM.get(id).fetch(request)
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ ok: true, service: 'kyoto-workflows' })
    }

    return new Response('not found', { status: 404 })
  }

  /** Cron handler — enqueue work to the notifications queue. */
  override async scheduled(controller: ScheduledController): Promise<void> {
    await this.env.NIGHTLY_CLEANUP.create({
      id: `cron-${controller.scheduledTime}`,
      params: { triggeredAt: controller.scheduledTime },
    })
  }

  /** Queue consumer — runs once per batch. */
  override async queue(batch: MessageBatch<unknown>): Promise<void> {
    if (batch.queue === 'kyoto-notifications') {
      await handleNotificationsBatch(batch, this.env)
    }
  }
}

async function authorize(url: URL, runId: string, env: Env): Promise<boolean> {
  const token = url.searchParams.get('token') ?? ''
  return await verifyRunToken(token, runId, env.TOKEN_SIGNING_KEY)
}

/**
 * Bridges the DO WebSocket to a Server-Sent Events response so plain
 * EventSource clients work without a WebSocket library.
 */
function openSseStream(env: Env, runId: string): Response {
  const id = env.RUN_ROOM.idFromName(runId)
  const stub = env.RUN_ROOM.get(id)

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = async (data: string): Promise<void> => {
    await writer.write(encoder.encode(`data: ${data}\n\n`))
  }

  ;(async () => {
    const upgrade = new Request(`https://internal/ws`, {
      headers: { Upgrade: 'websocket' },
    })
    const resp = await stub.fetch(upgrade)
    const ws = resp.webSocket
    if (!ws) {
      await writer.close()
      return
    }
    ws.accept()
    ws.addEventListener('message', (event) => {
      const data =
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer)
      void send(data)
    })
    ws.addEventListener('close', () => {
      void writer.close()
    })
  })().catch(() => {
    void writer.close()
  })

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
