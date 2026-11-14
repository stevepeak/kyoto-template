import {
  type ChatMessage,
  type ChatServerEvent,
  type ChatUser,
  chatClientEventSchema,
  chatUserSchema,
} from '@app/workflows-client'
import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

/** Header the Worker uses to hand the token-verified user to the room. */
export const CHAT_USER_HEADER = 'x-chat-user'

/** A reply still "thinking" after this long is assumed lost (run died). */
const PENDING_REPLY_TTL_MS = 2 * 60 * 1000

const pendingRepliesSchema = z.record(z.string(), z.number())

/**
 * One room of the live chat — who's viewing, who's typing, and new messages.
 *
 * - Browsers connect over WebSocket (hibernation API). Each socket carries its
 *   user as an attachment, so presence survives the room sleeping.
 * - Messages are stored in D1 by whoever writes them (tRPC for people, the
 *   007 run hook for the assistant), then pushed here via `publish`.
 * - "Assistant is thinking" is the set of in-flight replies, keyed by the
 *   message they answer, persisted so a late joiner sees it too.
 */
export class ChatRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Keepalive pings are answered without waking the room.
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    )
  }

  publish(message: ChatMessage): void {
    this.broadcast({ type: 'message', message })
  }

  async replyStarted(messageId: string): Promise<void> {
    const pending = await this.pendingReplies()
    pending[messageId] = Date.now()
    await this.ctx.storage.put('pendingReplies', pending)
    this.broadcast({ type: 'assistant', isThinking: true })
  }

  async replyFinished(messageId: string): Promise<void> {
    const pending = await this.pendingReplies()
    delete pending[messageId]
    await this.ctx.storage.put('pendingReplies', pending)
    this.broadcast({
      type: 'assistant',
      isThinking: Object.keys(pending).length > 0,
    })
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }
    const user = chatUserSchema.parse(
      JSON.parse(request.headers.get(CHAT_USER_HEADER) ?? 'null'),
    )
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment(user)

    const pending = await this.pendingReplies()
    send(server, {
      type: 'assistant',
      isThinking: Object.keys(pending).length > 0,
    })
    this.broadcastPresence()

    return new Response(null, { status: 101, webSocket: client })
  }

  override webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): void {
    if (typeof raw !== 'string') return
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return
    }
    const event = chatClientEventSchema.safeParse(json)
    if (!event.success) return
    const user = userOf(ws)
    if (!user) return
    // `typing` is the only client event; others don't need their own echo.
    this.broadcast({ type: 'typing', user }, { except: ws })
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code, 'closing')
    } catch {
      // Already closed.
    }
    this.broadcastPresence({ except: ws })
  }

  override webSocketError(ws: WebSocket): void {
    this.broadcastPresence({ except: ws })
  }

  private async pendingReplies(): Promise<Record<string, number>> {
    const stored = pendingRepliesSchema.safeParse(
      await this.ctx.storage.get('pendingReplies'),
    )
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(stored.success ? stored.data : {}).filter(
        ([, startedAt]) => now - startedAt < PENDING_REPLY_TTL_MS,
      ),
    )
  }

  private broadcastPresence(opts: { except?: WebSocket } = {}): void {
    const viewers = new Map<string, ChatUser>()
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === opts.except) continue
      const user = userOf(ws)
      if (user) viewers.set(user.id, user)
    }
    this.broadcast({ type: 'presence', viewers: [...viewers.values()] }, opts)
  }

  private broadcast(
    event: ChatServerEvent,
    opts: { except?: WebSocket } = {},
  ): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== opts.except) send(ws, event)
    }
  }
}

function userOf(ws: WebSocket): ChatUser | null {
  const parsed = chatUserSchema.safeParse(ws.deserializeAttachment())
  return parsed.success ? parsed.data : null
}

function send(ws: WebSocket, event: ChatServerEvent): void {
  try {
    ws.send(JSON.stringify(event))
  } catch {
    // Socket closed underneath us — Cloudflare will clean it up.
  }
}
