import { z } from 'zod'

/**
 * Live chat wire contract — shared by the web app (tRPC + browser), the
 * workflows Worker (ChatRoom DO) and the 007 host (the `chat_message`
 * trigger). D1 holds the history; the DO only fans events out.
 */

/** The room the floating chat opens. TODO: per-org / per-page rooms. */
export const DEFAULT_CHAT_ROOM = 'lobby'

/** Room ids are URL- and DO-name-safe. */
export const chatRoomIdSchema = z.string().regex(/^[a-z0-9-]{1,64}$/)

/** 007 event that asks the assistant for a reply. */
export const CHAT_TRIGGER_KIND = 'chat_message'

export const chatUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
})
export type ChatUser = z.infer<typeof chatUserSchema>

export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  role: z.enum(['user', 'assistant']),
  body: z.string(),
  /** The human who wrote it; `null` for the assistant. */
  author: chatUserSchema.nullable(),
  /** `failed` — the assistant's run failed; `body` holds the error. */
  status: z.enum(['sent', 'failed']),
  /** The 007 run behind an assistant message — "Inspect in 007". */
  workflowRunId: z.string().nullable(),
  /** Epoch ms. */
  createdAt: z.number(),
})
export type ChatMessage = z.infer<typeof chatMessageSchema>

/** ChatRoom DO → browser. */
export const chatServerEventSchema = z.discriminatedUnion('type', [
  /** Everyone with the room open, one entry per user (tabs collapse). */
  z.object({ type: z.literal('presence'), viewers: z.array(chatUserSchema) }),
  /** Someone is typing — clients expire it after a few seconds. */
  z.object({ type: z.literal('typing'), user: chatUserSchema }),
  z.object({ type: z.literal('message'), message: chatMessageSchema }),
  /** Whether a 007 reply is in flight for this room. */
  z.object({ type: z.literal('assistant'), isThinking: z.boolean() }),
])
export type ChatServerEvent = z.infer<typeof chatServerEventSchema>

/** Browser → ChatRoom DO. Messages go through tRPC, not the socket. */
export const chatClientEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('typing') }),
])
export type ChatClientEvent = z.infer<typeof chatClientEventSchema>

/** The `chat_message` trigger's input — what the 007 workflow sees. */
export const chatTriggerInputSchema = z.object({
  roomId: z.string(),
  messageId: z.string(),
  authorName: z.string(),
  text: z.string(),
  /** Recent messages as `Name: text` lines, oldest first. */
  transcript: z.string(),
})
export type ChatTriggerInput = z.infer<typeof chatTriggerInputSchema>
