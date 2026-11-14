import type { DB } from '@app/db'
import type { WorkflowsRpc } from '@app/workflows-client'

/** The signed-in user as the tRPC context carries it. */
export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/**
 * tRPC request context. Populated in apps/web/app/api/trpc/[trpc]/route.ts
 * (and by the app MCP route, which calls procedures via `createCaller`).
 *
 * - `db` is the request's D1 handle.
 * - `user` is `null` for anonymous requests; `protectedProcedure` rejects them.
 * - `workflows` is the Cloudflare service-binding RPC stub or, in dev where
 *   the binding isn't available, an HTTP-fallback shim with the same shape.
 */
export interface Context {
  db: DB
  user: SessionUser | null
  workflows: WorkflowsRpc
}
