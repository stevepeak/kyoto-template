import type { HostDeps } from '@app/wf-host'
import {
  type ChatMessage,
  chatMessageSchema,
  chatRoomIdSchema,
  type ChatTriggerInput,
  chatTriggerInputSchema,
  type ChatUser,
  chatUserSchema,
  type StartRunResult,
  type TriggeredRunOpts,
  workflowInputs,
  type WorkflowName,
  type WorkflowsRpc,
} from '@app/workflows-client'
import * as Sentry from '@sentry/cloudflare'
import { resolveAssignedVersion } from '@stevepeak/007'
import {
  startEvalSweepWorkflow,
  startGraphRun,
} from '@stevepeak/007/cloudflare'
// Durable classes come from the Worker-only `/runtime` subpath (they import
// `cloudflare:workers`); the barrel stays import-safe for the web app.
import {
  makeEvalSweepWorkflow,
  makeGraphWorkflow,
  makeRunRoom,
} from '@stevepeak/007/cloudflare/runtime'
import type {
  StartGraphRunInput,
  StartGraphRunResult,
} from '@stevepeak/007/engine'
import { createWfDb } from '@stevepeak/007/storage'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { z } from 'zod'

import { signRunToken, verifyChatToken, verifyRunToken } from './auth'
import { chatConnect, chatPublish, chatReply, workerWfConfig } from './chat'
import {
  CHAT_USER_HEADER,
  ChatRoom as ChatRoomBase,
} from './durable-objects/chat-room'
import { ProgressRoom as ProgressRoomBase } from './durable-objects/progress-room'
import { createEvalSweepClient } from './eval-sweep-client'
import { handleNotificationsBatch } from './queues/notifications'
import { sentryOptions } from './sentry'
import { DripEmail as DripEmailBase } from './workflows/drip-email'
import { ExampleAgent as ExampleAgentBase } from './workflows/example-agent'
import { HelloWorld as HelloWorldBase } from './workflows/hello-world'
import { NightlyCleanup as NightlyCleanupBase } from './workflows/nightly-cleanup'

// ── 007 ──────────────────────────────────────────────────────────────────────
// The SDK's durable classes, bound in wrangler.jsonc as GRAPH_WORKFLOW,
// EVAL_SWEEP_WORKFLOW and RUN_ROOM. Every exported class is wrapped with
// Sentry — each runs in its own invocation, so each needs its own init.
export const GraphWorkflow = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  makeGraphWorkflow<HostDeps, Env>(workerWfConfig),
)
export const EvalSweepWorkflow = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  makeEvalSweepWorkflow<Env>({ createClient: createEvalSweepClient }),
)
export const RunRoom = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions,
  makeRunRoom<HostDeps, Env>(workerWfConfig),
)

// ── Chat ─────────────────────────────────────────────────────────────────────
// Presence, typing and live fan-out for the app chat (see src/chat.ts).
export const ChatRoom = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions,
  ChatRoomBase,
)

/** Start the workflow version assigned to `triggerKind`. */
async function startTriggeredRun(
  env: Env,
  triggerKind: string,
  triggerInput: unknown,
  opts: TriggeredRunOpts = {},
): Promise<StartGraphRunResult> {
  const assigned = await resolveAssignedVersion(createWfDb(env.WF_DB), {
    triggerKind,
  })
  if (!assigned) {
    throw new Error(
      `No workflow assigned for trigger "${triggerKind}". Author and publish one in /workflows and assign it to this trigger.`,
    )
  }
  return await startGraphRun(env, {
    workflowVersionId: assigned.versionId,
    triggerKind,
    triggerInput,
    subjectId: opts.subjectId,
    correlationId: opts.correlationId,
    promptVariables: opts.promptVariables,
  })
}

// ── Example Cloudflare Workflows ─────────────────────────────────────────────
// TODO: decide whether to keep these hand-written example workflows (and the
// ProgressRoom/SSE plumbing below) now that 007 runs authored workflows.

export const ProgressRoom = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions,
  ProgressRoomBase,
)
export const HelloWorld = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  HelloWorldBase,
)
export const ExampleAgent = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  ExampleAgentBase,
)
export const DripEmail = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  DripEmailBase,
)
export const NightlyCleanup = Sentry.instrumentWorkflowWithSentry(
  sentryOptions,
  NightlyCleanupBase,
)

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

  const room = env.PROGRESS_ROOM.get(env.PROGRESS_ROOM.idFromName(runId))
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
class WorkflowsService extends WorkerEntrypoint<Env> implements WorkflowsRpc {
  async startRun(
    workflow: WorkflowName,
    params: unknown,
  ): Promise<StartRunResult> {
    return await startRun(this.env, workflow, params)
  }

  async startTriggeredRun(
    triggerKind: string,
    triggerInput: unknown,
    opts?: TriggeredRunOpts,
  ): Promise<StartGraphRunResult> {
    return await startTriggeredRun(this.env, triggerKind, triggerInput, opts)
  }

  /** Start a specific authored version — backs the SDK's `retryRun` hook. */
  async startGraphRun(input: StartGraphRunInput): Promise<StartGraphRunResult> {
    return await startGraphRun(this.env, input)
  }

  /** Start the workflow that runs an eval sweep, or restart one that died. */
  async startEvalSweep(input: {
    evalRunId: string
  }): Promise<{ started: boolean }> {
    return await startEvalSweepWorkflow(this.env, input)
  }

  async chatConnect(input: {
    roomId: string
    user: ChatUser
  }): Promise<{ url: string }> {
    return await chatConnect(this.env, input)
  }

  async chatPublish(input: {
    roomId: string
    message: ChatMessage
  }): Promise<void> {
    await chatPublish(this.env, input)
  }

  async chatReply(input: {
    roomId: string
    actorId: string
    trigger: ChatTriggerInput
  }): Promise<{ workflowRunId: string }> {
    return await chatReply(this.env, input)
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
      const body = await request.json<{
        workflow: WorkflowName
        params?: unknown
      }>()
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
      const room = env.PROGRESS_ROOM.get(env.PROGRESS_ROOM.idFromName(runId))
      // DO stub methods return `Rpc.Result`, which typescript-eslint can't
      // see as thenable even though it is a Promise at runtime.
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const state = await room.getState(runId)
      return Response.json(state, { headers: corsHeaders })
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
      const id = env.PROGRESS_ROOM.idFromName(runId)
      return await env.PROGRESS_ROOM.get(id).fetch(request)
    }

    // GET /chat/:roomId/ws?token=  — WebSocket into the room's ChatRoom DO.
    // The token (minted by the web app's `chat.connect`) names the user.
    const chatMatch = url.pathname.match(/^\/chat\/([^/]+)\/ws$/)
    if (chatMatch) {
      const roomId = chatMatch[1]
      const user = await verifyChatToken({
        token: url.searchParams.get('token') ?? '',
        roomId,
        secret: env.TOKEN_SIGNING_KEY,
      })
      if (!user) return new Response('unauthorized', { status: 401 })
      const headers = new Headers(request.headers)
      headers.set(CHAT_USER_HEADER, JSON.stringify(user))
      const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId))
      return await room.fetch(new Request(request, { headers }))
    }

    // POST /chat/{connect,publish,reply} — the chat half of the `next dev`
    // HTTP fallback; same bearer gate as the 007 routes below.
    if (request.method === 'POST' && url.pathname.startsWith('/chat/')) {
      const secret = env.WORKFLOWS_SHARED_SECRET
      const auth = request.headers.get('authorization') ?? ''
      if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
        return new Response('unauthorized', { status: 401 })
      }
      const body: unknown = await request.json()
      if (url.pathname === '/chat/connect') {
        const input = chatConnectInput.parse(body)
        return Response.json(await chatConnect(env, input))
      }
      if (url.pathname === '/chat/publish') {
        await chatPublish(env, chatPublishInput.parse(body))
        return Response.json({ ok: true })
      }
      if (url.pathname === '/chat/reply') {
        return Response.json(await chatReply(env, chatReplyInput.parse(body)))
      }
    }

    // POST /graph-runs | /triggered-runs | /eval-sweeps — the 007 half of the
    // `next dev` HTTP fallback (apps/web/lib/workflows.ts). Production uses the
    // service binding. Bearer-gated and fails CLOSED: with no
    // WORKFLOWS_SHARED_SECRET set these routes are unreachable.
    if (
      request.method === 'POST' &&
      ['/graph-runs', '/triggered-runs', '/eval-sweeps'].includes(url.pathname)
    ) {
      const secret = env.WORKFLOWS_SHARED_SECRET
      const auth = request.headers.get('authorization') ?? ''
      if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
        return new Response('unauthorized', { status: 401 })
      }
      if (url.pathname === '/graph-runs') {
        const input = await request.json<StartGraphRunInput>()
        return Response.json(await startGraphRun(env, input))
      }
      if (url.pathname === '/triggered-runs') {
        const body = await request.json<{
          triggerKind: string
          triggerInput: unknown
          opts?: TriggeredRunOpts
        }>()
        return Response.json(
          await startTriggeredRun(
            env,
            body.triggerKind,
            body.triggerInput,
            body.opts,
          ),
        )
      }
      const input = await request.json<{ evalRunId: string }>()
      return Response.json(await startEvalSweepWorkflow(env, input))
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ ok: true, service: 'template-workflows' })
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
    // Prefix match: staging's queue is `template-notifications-staging`.
    if (batch.queue.startsWith('template-notifications')) {
      await handleNotificationsBatch(batch, this.env)
    }
  }
}

const chatConnectInput = z.object({
  roomId: chatRoomIdSchema,
  user: chatUserSchema,
})
const chatPublishInput = z.object({
  roomId: chatRoomIdSchema,
  message: chatMessageSchema,
})
const chatReplyInput = z.object({
  roomId: chatRoomIdSchema,
  actorId: z.string(),
  trigger: chatTriggerInputSchema,
})

// Errors in RPC calls, fetch, cron and queue handlers all reach Sentry.
export default Sentry.withSentry(sentryOptions, WorkflowsService)

/**
 * Length-independent equality for the shared-secret check, so a wrong token
 * can't be recovered byte-by-byte from response timing.
 */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
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
  const id = env.PROGRESS_ROOM.idFromName(runId)
  const stub = env.PROGRESS_ROOM.get(id)

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
