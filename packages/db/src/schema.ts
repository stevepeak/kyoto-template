// Auth schema (Better Auth core + passkey + admin + API keys + rate limits)
export * from './auth-schema'
// OAuth 2.1 authorization server (Better Auth `mcp()` + `jwt()` plugins)
export * from './oauth-schema'
// Security audit trail: sign-ins, credential changes, app MCP tool calls
export * from './audit-schema'
// Per-user email category opt-outs
export * from './notification-schema'
// Stripe subscriptions (Better Auth `stripe()` plugin)
export * from './billing-schema'
// Live chat rooms + history (see apps/workflows ChatRoom DO)
export * from './chat-schema'

// TODO: add your app tables here (or in sibling files re-exported from here),
// then run `bun run --cwd packages/db db:generate`.
