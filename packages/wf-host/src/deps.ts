import type { RunContext } from '@stevepeak/007'

import type { HostEnv } from './env'

/**
 * The private per-run bundle threaded into every tool's `build(deps)`. The SDK
 * never inspects it. Constructed by `buildRunDeps` inside each `step.do`
 * boundary, where live bindings exist.
 *
 * Identity mapping (see packages/007/guide.md §8): there is no tenant column.
 * `correlationId` carries the data scope and `subjectId` the entity the run is
 * about — see `run-scope.ts`.
 */
export type HostDeps = {
  env: HostEnv
  // TODO: add the clients your tools need (e.g. `db: createDb(env.DB)`),
  // built here from `env` — never at module scope.
  /** Data scope (from `RunContext.correlationId`). */
  scopeId: string
  /** The entity this run is about (from `RunContext.subjectId`). */
  subjectId: string
}

export function buildRunDeps(ctx: RunContext): HostDeps {
  const env = ctx.env as HostEnv
  return {
    env,
    scopeId: ctx.correlationId ?? '',
    subjectId: ctx.subjectId ?? '',
  }
}
