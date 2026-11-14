import { and, desc, eq, schema } from '@app/db'

import type { McpAuditEntry } from '@/components/settings/mcp-audit-section'

import { getDb } from './db'

/** How many recent calls the audit log shows. */
const AUDIT_LIMIT = 50

/** This user's most recent app MCP tool calls, newest first. */
export async function listMcpToolCalls(
  userId: string,
): Promise<McpAuditEntry[]> {
  const rows = await getDb()
    .select({
      id: schema.auditEvent.id,
      tool: schema.auditEvent.tool,
      intent: schema.auditEvent.intent,
      arguments: schema.auditEvent.arguments,
      ok: schema.auditEvent.ok,
      error: schema.auditEvent.error,
      durationMs: schema.auditEvent.durationMs,
      createdAt: schema.auditEvent.createdAt,
      clientId: schema.auditEvent.clientId,
      // Left join: the trail outlives a deleted client.
      clientName: schema.oauthClient.name,
    })
    .from(schema.auditEvent)
    .leftJoin(
      schema.oauthClient,
      eq(schema.oauthClient.clientId, schema.auditEvent.clientId),
    )
    .where(
      and(
        eq(schema.auditEvent.userId, userId),
        eq(schema.auditEvent.type, 'mcp_tool_call'),
      ),
    )
    .orderBy(desc(schema.auditEvent.createdAt))
    .limit(AUDIT_LIMIT)
  // The MCP columns are nullable only because other event types share the
  // table; every `mcp_tool_call` row sets them.
  return rows.map((row) => ({
    ...row,
    tool: row.tool ?? '',
    intent: row.intent ?? '',
    clientId: row.clientId ?? '',
    durationMs: row.durationMs ?? 0,
    createdAt: row.createdAt.toISOString(),
  }))
}
