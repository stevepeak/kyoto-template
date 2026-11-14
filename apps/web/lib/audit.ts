import {
  and,
  type AuditEventDetail,
  type AuditEventType,
  type DB,
  desc,
  eq,
  ne,
  schema,
} from '@app/db'

import type { SecurityEventEntry } from '@/components/settings/security-log-section'

import { getDb } from './db'

/** How many recent account events Settings → Security shows. */
const SECURITY_LOG_LIMIT = 50

/**
 * Append one account event to the audit trail.
 *
 * Never throws: the action it describes has already happened, and a failed
 * write must not turn it into an error the user sees.
 */
export async function recordAuditEvent(args: {
  db: DB
  userId: string
  type: Exclude<AuditEventType, 'mcp_tool_call'>
  ipAddress?: string | null
  userAgent?: string | null
  detail?: AuditEventDetail
}): Promise<void> {
  try {
    await args.db.insert(schema.auditEvent).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      type: args.type,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
      detail: args.detail ?? null,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('[audit] write failed', args.type, err)
  }
}

/** The client's IP and User-Agent, for an event recorded mid-request. */
export function requestOrigin(request: Request | undefined): {
  ipAddress: string | null
  userAgent: string | null
} {
  return {
    ipAddress: request?.headers.get('cf-connecting-ip') ?? null,
    userAgent: request?.headers.get('user-agent') ?? null,
  }
}

/**
 * This user's recent account events — everything but MCP tool calls, which
 * Settings → MCP lists on their own — newest first.
 */
export async function listSecurityEvents(
  userId: string,
): Promise<SecurityEventEntry[]> {
  const rows = await getDb()
    .select({
      id: schema.auditEvent.id,
      type: schema.auditEvent.type,
      ipAddress: schema.auditEvent.ipAddress,
      userAgent: schema.auditEvent.userAgent,
      detail: schema.auditEvent.detail,
      createdAt: schema.auditEvent.createdAt,
    })
    .from(schema.auditEvent)
    .where(
      and(
        eq(schema.auditEvent.userId, userId),
        ne(schema.auditEvent.type, 'mcp_tool_call'),
      ),
    )
    .orderBy(desc(schema.auditEvent.createdAt))
    .limit(SECURITY_LOG_LIMIT)
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }))
}
