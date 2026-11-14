// Hand-written mirror of the bindings in wrangler.jsonc (`wrangler types`
// output isn't reproducible — it reads the local .env). Add a field whenever
// you add a binding, var or secret.

import { type ProgressRoom } from './src/durable-objects/progress-room'
import type { RunRoom } from '@stevepeak/007/cloudflare/runtime'

// `WorkerEntrypoint<Env>` / `WorkflowEntrypoint<Env>` from `cloudflare:workers`
// default to `Cloudflare.Env`, so the bindings are declared on that namespace
// and the global `Env` our classes use extends it — one env type everywhere.
declare global {
  namespace Cloudflare {
    interface Env {
      // Example workflows
      HELLO_WORLD: Workflow
      EXAMPLE_AGENT: Workflow
      DRIP_EMAIL: Workflow
      NIGHTLY_CLEANUP: Workflow

      // Example per-run progress DO — typed namespace so RPC methods are checked.
      PROGRESS_ROOM: DurableObjectNamespace<ProgressRoom>

      // 007 — consumed by startGraphRun / the SDK runtime.
      GRAPH_WORKFLOW: Workflow
      EVAL_SWEEP_WORKFLOW: Workflow
      RUN_ROOM: DurableObjectNamespace<RunRoom>
      WF_DB: D1Database

      // App database.
      DB: D1Database

      // Cloudflare Email Sending.
      EMAIL: SendEmail

      // The deployed Worker version — Sentry's release id.
      CF_VERSION_METADATA: WorkerVersionMetadata

      // Queue producer binding.
      NOTIFICATIONS: Queue<unknown>

      // Vars / secrets.
      PUBLIC_BASE_URL: string
      TOKEN_SIGNING_KEY: string
      OPENROUTER_API_KEY?: string
      WF_CONNECTOR_KEY?: string
      WF_SDK_RELEASE?: string
      // Dev-only bearer for the HTTP fallback routes; leave unset in production.
      WORKFLOWS_SHARED_SECRET?: string
      SENTRY_DSN?: string
    }
  }

  interface Env extends Cloudflare.Env {}
}

export {}
