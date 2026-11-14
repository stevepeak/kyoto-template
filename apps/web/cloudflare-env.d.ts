// Hand-written mirror of the bindings in wrangler.jsonc. `wrangler types`
// output isn't reproducible (it reads the local .env and types vars as
// literals), so this is maintained by hand — add a field whenever you add a
// binding, var or secret.

import type { WorkflowsRpc } from '@app/workflows-client'

declare global {
  interface CloudflareEnv {
    ASSETS: Fetcher

    // D1 — app tables (`template-db`) and 007's wf_* tables (`template-wf`).
    DB: D1Database
    WF_DB: D1Database

    // Service binding to the workflows worker.
    WORKFLOWS: Fetcher & WorkflowsRpc

    // Cloudflare Email Sending.
    EMAIL: SendEmail

    // The deployed Worker version — Sentry's release id.
    CF_VERSION_METADATA: WorkerVersionMetadata

    // R2: user-uploaded profile pictures.
    AVATARS: R2Bucket

    // Vars
    APP_URL?: string
    GOOGLE_CLIENT_ID?: string
    TURNSTILE_SITE_KEY?: string
    EMAIL_FROM?: string
    EMAIL_FROM_NAME?: string
    POSTHOG_HOST?: string
    // Set on PR preview deploys: robots.txt then disallows everything.
    NOINDEX?: string

    // Secrets (`wrangler secret put …`)
    BETTER_AUTH_SECRET?: string
    GOOGLE_CLIENT_SECRET?: string
    TURNSTILE_SECRET_KEY?: string
    OPENROUTER_API_KEY?: string
    WF_CONNECTOR_KEY?: string
    POSTHOG_API_KEY?: string
    SENTRY_DSN?: string
    STRIPE_SECRET_KEY?: string
    STRIPE_WEBHOOK_SECRET?: string

    // TODO: see lib/wf-access.ts — who may use the 007 console.
    WF_ADMIN_EMAILS?: string
    // Dev-only bearer for the workflows worker HTTP fallback.
    WORKFLOWS_SHARED_SECRET?: string
  }
}

export {}
