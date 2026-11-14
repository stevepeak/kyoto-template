import { createWfMcpRoute } from '@/lib/wf-mcp'
import { WF_MCP_SCOPES } from '@/lib/mcp-resources'

/** 007 workflow MCP — read tools. */
export const POST = createWfMcpRoute([WF_MCP_SCOPES.read])
