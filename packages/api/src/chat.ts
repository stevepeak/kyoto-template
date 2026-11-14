import { type DB, desc, eq, schema, sql } from '@app/db'
import {
  type ChatMessage,
  chatRoomIdSchema,
  type ChatUser,
} from '@app/workflows-client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { SessionUser } from './context'
import { protectedProcedure, router } from './trpc'

/** How much history a client loads, and how much the assistant sees. */
const HISTORY_LIMIT = 50
const TRANSCRIPT_LIMIT = 20

/**
 * Whether the assistant answers this message.
 * TODO: product decision — every message, or only `@ai` mentions once rooms
 * have several people in them.
 */
function shouldAssistantReply(_body: string): boolean {
  return true
}

async function ensureRoom(db: DB, roomId: string): Promise<void> {
  await db
    .insert(schema.chatRoom)
    .values({ id: roomId, name: roomId, createdAt: new Date() })
    .onConflictDoNothing()
}

/** The session user as the chat shows them (name + avatar). */
async function chatUserFor(db: DB, user: SessionUser): Promise<ChatUser> {
  const [row] = await db
    .select({ name: schema.user.name, image: schema.user.image })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return { id: user.id, name: row.name || user.email, image: row.image }
}

/** The room's newest `limit` messages, oldest first. */
async function recentMessages(
  db: DB,
  args: { roomId: string; limit: number },
): Promise<ChatMessage[]> {
  const rows = await db
    .select({
      message: schema.chatMessage,
      authorName: schema.user.name,
      authorImage: schema.user.image,
    })
    .from(schema.chatMessage)
    .leftJoin(schema.user, eq(schema.chatMessage.userId, schema.user.id))
    .where(eq(schema.chatMessage.roomId, args.roomId))
    .orderBy(desc(schema.chatMessage.createdAt))
    .limit(args.limit)

  return rows.reverse().map(({ message, authorName, authorImage }) => ({
    id: message.id,
    roomId: message.roomId,
    role: message.role,
    body: message.body,
    author: message.userId
      ? { id: message.userId, name: authorName ?? '', image: authorImage }
      : null,
    status: message.status,
    workflowRunId: message.workflowRunId,
    createdAt: message.createdAt.getTime(),
  }))
}

/** `Team standup!` → `team-standup-x7k2p9`: readable, unique, a valid room id. */
function roomIdFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomUUID().slice(0, 6)
  return slug ? `${slug}-${suffix}` : `chat-${suffix}`
}

const roomInput = z.object({ roomId: chatRoomIdSchema })

export const chatRouter = router({
  /** Every room, most recently active first, with its latest message. */
  rooms: protectedProcedure.query(async ({ ctx }) => {
    const room = schema.chatRoom
    const rows = await ctx.db
      .select({
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
        messageCount: sql<number>`(select count(*) from chat_message m where m.room_id = chat_room.id)`,
        lastMessageAt: sql<
          number | null
        >`(select max(m.created_at) from chat_message m where m.room_id = chat_room.id)`,
        lastBody: sql<
          string | null
        >`(select m.body from chat_message m where m.room_id = chat_room.id order by m.created_at desc limit 1)`,
        // The assistant has no user row, so a null name on a message means it.
        lastAuthor: sql<
          string | null
        >`(select coalesce(u.name, 'Assistant') from chat_message m left join user u on u.id = m.user_id where m.room_id = chat_room.id order by m.created_at desc limit 1)`,
      })
      .from(room)
    return rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        messageCount: r.messageCount,
        lastMessage:
          r.lastBody == null
            ? null
            : { body: r.lastBody, authorName: r.lastAuthor ?? 'Assistant' },
        lastActivityAt: r.lastMessageAt ?? r.createdAt.getTime(),
      }))
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
  }),

  createRoom: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const id = roomIdFor(input.name)
      await ctx.db
        .insert(schema.chatRoom)
        .values({ id, name: input.name, createdAt: new Date() })
      return { id }
    }),

  /** A WebSocket URL into the room for live presence, typing and messages. */
  connect: protectedProcedure
    .input(roomInput)
    .mutation(async ({ ctx, input }) => {
      await ensureRoom(ctx.db, input.roomId)
      return await ctx.workflows.chatConnect({
        roomId: input.roomId,
        user: await chatUserFor(ctx.db, ctx.user),
      })
    }),

  history: protectedProcedure.input(roomInput).query(async ({ ctx, input }) => {
    return await recentMessages(ctx.db, {
      roomId: input.roomId,
      limit: HISTORY_LIMIT,
    })
  }),

  /** Store, fan out, and (maybe) ask the 007 assistant for a reply. */
  send: protectedProcedure
    .input(roomInput.extend({ body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }): Promise<ChatMessage> => {
      await ensureRoom(ctx.db, input.roomId)
      const author = await chatUserFor(ctx.db, ctx.user)
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        roomId: input.roomId,
        role: 'user',
        body: input.body,
        author,
        status: 'sent',
        workflowRunId: null,
        createdAt: Date.now(),
      }
      await ctx.db.insert(schema.chatMessage).values({
        id: message.id,
        roomId: message.roomId,
        userId: author.id,
        role: 'user',
        body: message.body,
        status: 'sent',
        createdAt: new Date(message.createdAt),
      })
      await ctx.workflows.chatPublish({ roomId: input.roomId, message })

      if (shouldAssistantReply(input.body)) {
        const transcript = (
          await recentMessages(ctx.db, {
            roomId: input.roomId,
            limit: TRANSCRIPT_LIMIT,
          })
        )
          .map((m) => `${m.author?.name ?? 'Assistant'}: ${m.body}`)
          .join('\n')
        await ctx.workflows.chatReply({
          roomId: input.roomId,
          actorId: author.id,
          trigger: {
            roomId: input.roomId,
            messageId: message.id,
            authorName: author.name,
            text: input.body,
            transcript,
          },
        })
      }
      return message
    }),
})
