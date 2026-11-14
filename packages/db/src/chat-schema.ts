import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth-schema'

/**
 * A chat room. Created on first use; any signed-in user may join.
 * TODO: membership / per-org rooms if chat shouldn't be open to everyone.
 */
export const chatRoom = sqliteTable('chat_room', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

/**
 * Chat history. Live delivery, presence and typing go through the ChatRoom
 * Durable Object (apps/workflows); this table is what a reconnecting client
 * reloads. Assistant rows are written by the 007 run (`workflow_run_id`, the
 * `wf_run` id in WF_DB — not a foreign key, it's another database).
 */
export const chatMessage = sqliteTable(
  'chat_message',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => chatRoom.id, { onDelete: 'cascade' }),
    /** `null` for assistant messages. */
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    body: text('body').notNull(),
    status: text('status', { enum: ['sent', 'failed'] })
      .notNull()
      .default('sent'),
    workflowRunId: text('workflow_run_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('chat_message_room_created_idx').on(t.roomId, t.createdAt)],
)
