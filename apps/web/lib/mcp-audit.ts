import { desc, eq, schema } from '@app/db'

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
      id: schema.mcpToolCall.id,
      tool: schema.mcpToolCall.tool,
      intent: schema.mcpToolCall.intent,
      arguments: schema.mcpToolCall.arguments,
      ok: schema.mcpToolCall.ok,
      error: schema.mcpToolCall.error,
      durationMs: schema.mcpToolCall.durationMs,
      createdAt: schema.mcpToolCall.createdAt,
      clientId: schema.mcpToolCall.clientId,
      // Left join: the trail outlives a deleted client.
      clientName: schema.oauthClient.name,
    })
    .from(schema.mcpToolCall)
    .leftJoin(
      schema.oauthClient,
      eq(schema.oauthClient.clientId, schema.mcpToolCall.clientId),
    )
    .where(eq(schema.mcpToolCall.userId, userId))
    .orderBy(desc(schema.mcpToolCall.createdAt))
    .limit(AUDIT_LIMIT)
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }))
}
