import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth-schema'

/** What an audit row records. */
export const AUDIT_EVENT_TYPES = [
  /** A tool call on the app's own MCP (/api/mcp) — not 007's. */
  'mcp_tool_call',
  /** A new session: any sign-in method, or an email-verification sign-in. */
  'sign_in',
  /** An admin started a session as this user. */
  'impersonated',
  'password_changed',
  'password_reset',
  'passkey_added',
  'api_key_created',
  'api_key_deleted',
] as const

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number]

/** Event-specific extras that don't earn a column of their own. */
export type AuditEventDetail = {
  /** How a sign-in happened, e.g. "password", "passkey", "google". */
  method?: string | null
  /** The admin's user id, for `impersonated`. */
  impersonatedBy?: string
  /** The passkey's or API key's name, when it has one. */
  name?: string | null
}

/**
 * The account's security audit trail: sign-ins, credential changes, and every
 * call to a tool on the app MCP. Shown on Settings → Security (account events)
 * and Settings → MCP (tool calls); MCP calls also go to PostHog.
 *
 * MCP tool calls require an `intent` (why the assistant is calling), so that
 * part of the trail says what an assistant did and its stated reason. The
 * `client_id` … `duration_ms` columns are set for `mcp_tool_call` rows only.
 *
 * `client_id` is deliberately NOT a foreign key: the trail should outlive the
 * OAuth client it names, so deleting a client doesn't erase what it did.
 */
export const auditEvent = sqliteTable(
  'audit_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', { enum: AUDIT_EVENT_TYPES }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    detail: text('detail', { mode: 'json' }).$type<AuditEventDetail>(),
    clientId: text('client_id'),
    tool: text('tool'),
    intent: text('intent'),
    /** The tool's own arguments, `intent` removed. */
    arguments: text('arguments', { mode: 'json' }),
    ok: integer('ok', { mode: 'boolean' }).notNull().default(true),
    /** The message the model was shown, when the call failed. */
    error: text('error'),
    durationMs: integer('duration_ms'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('audit_event_user_type_created_idx').on(
      t.userId,
      t.type,
      t.createdAt,
    ),
  ],
)
