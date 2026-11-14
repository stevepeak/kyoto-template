// Auth schema (Better Auth core + passkey)
export * from './auth-schema'
// OAuth 2.1 authorization server (Better Auth `mcp()` + `jwt()` plugins)
export * from './oauth-schema'
// Audit trail of app MCP tool calls
export * from './mcp-schema'

// TODO: add your app tables here (or in sibling files re-exported from here),
// then run `bun run --cwd packages/db db:generate`.
