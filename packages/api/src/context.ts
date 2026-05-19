import { type WorkflowsRpc } from '@app/workflows-client'

/**
 * tRPC request context. Populated in apps/web/app/api/trpc/[trpc]/route.ts —
 * `workflows` is the Cloudflare service-binding RPC stub or, in dev where
 * the binding isn't available, an HTTP-fallback shim with the same shape.
 */
export interface Context {
  workflows: WorkflowsRpc
}
