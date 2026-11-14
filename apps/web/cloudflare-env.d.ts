// Hand-written mirror of the bindings in wrangler.jsonc. `wrangler types`
// output isn't reproducible (it reads the local .env and types vars as
// literals), so this is maintained by hand — add a field whenever you add a
// binding, var or secret.

import type { WorkflowsRpc } from '@app/workflows-client'

declare global {
  interface CloudflareEnv {
    ASSETS: Fetcher

    // D1 — app tables (`kyoto-db`) and 007's wf_* tables (`kyoto-wf`).
    DB: D1Database
    WF_DB: D1Database

    // Service binding to the workflows worker.
    WORKFLOWS: Fetcher & WorkflowsRpc

    // Cloudflare Email Sending.
    EMAIL: SendEmail

    // Vars
    APP_URL?: string
    GOOGLE_CLIENT_ID?: string
    EMAIL_FROM?: string
    EMAIL_FROM_NAME?: string

    // Secrets (`wrangler secret put …`)
    BETTER_AUTH_SECRET?: string
    GOOGLE_CLIENT_SECRET?: string
    OPENROUTER_API_KEY?: string
    WF_CONNECTOR_KEY?: string

    // TODO: see lib/wf-access.ts — who may use the 007 console.
    WF_ADMIN_EMAILS?: string
    // Dev-only bearer for the workflows worker HTTP fallback.
    WORKFLOWS_SHARED_SECRET?: string
  }
}

export {}
