/**
 * The live Cloudflare bindings the host reads out of `RunContext.env` at run
 * time. The SDK treats `RunContext.env` as `unknown` — this is our type for it
 * and we own the cast (in `getModel` / `buildRunDeps`).
 *
 * `WF_DB` (D1) is consumed by the SDK's runtime; the rest by our tools.
 */
export type HostEnv = {
  /**
   * D1 database dedicated to the SDK's `wf_*` tables. Named `WF_DB` by the
   * SDK's binding contract so `DB` stays free for the app database.
   */
  WF_DB: D1Database
  /** The app database — for tools that read/write app tables. */
  DB?: D1Database
  /** OpenRouter key — the model provider boundary (`model.ts`). */
  OPENROUTER_API_KEY?: string
  /**
   * AES key for MCP connector credentials. Optional, and its absence is the
   * feature switch: without it no `mcp:*` connector tool is registered. Must be
   * identical on both Workers; rotating it forces every connector to reconnect.
   */
  WF_CONNECTOR_KEY?: string
}
