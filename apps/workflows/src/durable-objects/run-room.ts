import {
  type RunState,
  type RunStatus,
  type WorkflowName,
} from '@app/workflows-client'
import { DurableObject } from 'cloudflare:workers'

interface PersistedState {
  workflow: WorkflowName
  status: RunStatus
  progress: string[]
  output: unknown
  error: string | null
}

/**
 * Per-run coordination room.
 *
 * - Workflow steps call `append`, `setStatus`, `setOutput`, `setError` via DO RPC.
 * - Browsers connect via WebSocket (hibernation API) or SSE for live progress.
 * - State is persisted in the DO's SQLite-backed storage so reconnecting
 *   clients can replay the run from the beginning.
 */
export class RunRoom extends DurableObject<Env> {
  private memo: PersistedState | null = null

  private async load(): Promise<PersistedState> {
    if (this.memo) return this.memo
    const stored = await this.ctx.storage.get<PersistedState>('state')
    this.memo = stored ?? {
      workflow: 'hello-world',
      status: 'queued',
      progress: [],
      output: null,
      error: null,
    }
    return this.memo
  }

  private async save(state: PersistedState): Promise<void> {
    this.memo = state
    await this.ctx.storage.put('state', state)
  }

  private broadcast(event: {
    type: string
    data: unknown
    channel?: string
  }): void {
    const payload = JSON.stringify(event)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        // Socket closed underneath us — Cloudflare will clean it up.
      }
    }
  }

  async init(workflow: WorkflowName): Promise<void> {
    const state = await this.load()
    state.workflow = workflow
    state.status = 'queued'
    await this.save(state)
  }

  async append(channel: string, text: string): Promise<void> {
    const state = await this.load()
    if (channel === 'progress') {
      state.progress.push(text)
      await this.save(state)
    }
    this.broadcast({ type: 'stream', channel, data: text })
  }

  async setStatus(status: RunStatus): Promise<void> {
    const state = await this.load()
    state.status = status
    await this.save(state)
    this.broadcast({ type: 'status', data: status })
  }

  async setOutput(output: unknown): Promise<void> {
    const state = await this.load()
    state.output = output
    state.status = 'completed'
    await this.save(state)
    this.broadcast({ type: 'output', data: output })
    this.broadcast({ type: 'status', data: 'completed' })
  }

  async setError(error: string): Promise<void> {
    const state = await this.load()
    state.error = error
    state.status = 'failed'
    await this.save(state)
    this.broadcast({ type: 'error', data: error })
    this.broadcast({ type: 'status', data: 'failed' })
  }

  async getState(runId: string): Promise<RunState> {
    const state = await this.load()
    return {
      runId,
      workflow: state.workflow,
      status: state.status,
      progress: state.progress,
      output: state.output,
      error: state.error,
    }
  }

  /**
   * WebSocket upgrade handler. The DO accepts the socket via the hibernation
   * API so the room can sleep between events without billing for idle time.
   * Sends the full current state on connect so late subscribers catch up.
   */
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)

    const state = await this.load()
    server.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          status: state.status,
          progress: state.progress,
          output: state.output,
          error: state.error,
        },
      }),
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  override webSocketMessage(_ws: WebSocket, _msg: string | ArrayBuffer): void {
    // Read-only stream — ignore client messages.
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code, 'closing')
    } catch {
      // ignore
    }
  }
}
