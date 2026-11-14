import type { Metadata } from 'next'
import { headers } from 'next/headers'

import {
  type McpServer,
  McpServersSection,
} from '@/components/settings/mcp-servers-section'
import { getAuth } from '@/lib/auth'
import { APP_MCP_PATH, resourceUrl, WF_MCP_PATH } from '@/lib/mcp-resources'
import { canUseWorkflows } from '@/lib/wf-access'

export const metadata: Metadata = { title: 'MCP' }

export default async function McpSettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })

  // TODO: describe what the app's MCP offers once it has real tools.
  const servers: McpServer[] = [
    {
      name: 'App',
      description: 'Your account and data in this app.',
      url: resourceUrl(APP_MCP_PATH),
    },
  ]
  if (canUseWorkflows(session?.user.email)) {
    servers.push({
      name: '007 Workflows',
      description: 'Author, run, and inspect workflows. Admins only.',
      url: resourceUrl(WF_MCP_PATH),
    })
  }

  return <McpServersSection servers={servers} />
}
