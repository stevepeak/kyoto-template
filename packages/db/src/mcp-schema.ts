import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth-schema'

/**
 * One call to a tool on the app's own MCP (/api/mcp) — not 007's.
 *
 * Every tool requires an `intent` (why the assistant is calling it), so this is
 * an audit trail a person can read: what their assistant did, and its stated
 * reason. Shown on Settings → MCP, and the same call goes to PostHog.
 *
 * `client_id` is deliberately NOT a foreign key: the trail should outlive the
 * OAuth client it names, so deleting a client doesn't erase what it did.
 */
export const mcpToolCall = sqliteTable(
  'mcp_tool_call',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    tool: text('tool').notNull(),
    intent: text('intent').notNull(),
    /** The tool's own arguments, `intent` removed. */
    arguments: text('arguments', { mode: 'json' }),
    ok: integer('ok', { mode: 'boolean' }).notNull(),
    /** The message the model was shown, when the call failed. */
    error: text('error'),
    durationMs: integer('duration_ms').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('mcp_tool_call_user_created_idx').on(t.userId, t.createdAt)],
)
