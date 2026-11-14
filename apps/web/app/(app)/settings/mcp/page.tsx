import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { McpAuditSection } from '@/components/settings/mcp-audit-section'
import { McpConnectionsSection } from '@/components/settings/mcp-connections-section'
import {
  type McpTool,
  McpToolsSection,
} from '@/components/settings/mcp-tools-section'
import { APP_MCP_TOOLS } from '@/lib/app-mcp'
import { getAuth } from '@/lib/auth'
import { listMcpToolCalls } from '@/lib/mcp-audit'
import { listMcpConnections } from '@/lib/mcp-connections'
import { APP_MCP_PATH, resourceUrl } from '@/lib/mcp-resources'

export const metadata: Metadata = { title: 'MCP' }

const tools: McpTool[] = Object.entries(APP_MCP_TOOLS).map(([name, tool]) => ({
  name,
  ...tool,
}))

export default async function McpSettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  const [connections, auditEntries] = session
    ? await Promise.all([
        listMcpConnections(session.user.id),
        listMcpToolCalls(session.user.id),
      ])
    : [[], []]

  return (
    <>
      <McpConnectionsSection
        connections={connections}
        url={resourceUrl(APP_MCP_PATH)}
      />
      <McpToolsSection tools={tools} />
      <McpAuditSection entries={auditEntries} />
    </>
  )
}
