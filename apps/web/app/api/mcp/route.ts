import { handleAppMcpRequest } from '@/lib/app-mcp'

/** The app's own MCP server (OAuth, scope `APP_MCP_SCOPE`). */
export async function POST(req: Request) {
  return await handleAppMcpRequest(req)
}
