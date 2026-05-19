// Hand-rolled until `wrangler types` runs in CI. Mirrors the bindings in
// wrangler.jsonc. Regenerate with `bun --cwd apps/workflows cf-typegen`.

import { type RunRoom } from './src/durable-objects/run-room'

declare global {
  interface Env {
    // Workflows
    HELLO_WORLD: Workflow
    EXAMPLE_AGENT: Workflow
    DRIP_EMAIL: Workflow
    NIGHTLY_CLEANUP: Workflow

    // Durable Object — typed namespace so RPC methods are checked.
    RUN_ROOM: DurableObjectNamespace<RunRoom>

    // Queue producer binding.
    NOTIFICATIONS: Queue<unknown>

    // Vars / secrets.
    PUBLIC_BASE_URL: string
    TOKEN_SIGNING_KEY: string
    OPENROUTER_API_KEY: string
    SENTRY_DSN?: string
  }
}

export {}
