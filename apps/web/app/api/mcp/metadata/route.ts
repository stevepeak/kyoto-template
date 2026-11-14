import { appMcpResourceMetadata } from '@/lib/app-mcp'

// Reached through the `/.well-known/oauth-protected-resource/api/mcp` rewrite
// in next.config.js.
export function GET(): Response {
  return Response.json(appMcpResourceMetadata())
}
