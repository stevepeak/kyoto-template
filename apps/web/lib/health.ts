import { cfEnv } from './cf-env'

// How long one dependency may take before it counts as down.
const CHECK_TIMEOUT_MS = 3000

type CheckResult = { ok: boolean; ms: number }

export type HealthReport = {
  status: 'ok' | 'degraded'
  checks: Record<string, CheckResult>
}

/**
 * Times `probe`, failing it on a throw or after {@link CHECK_TIMEOUT_MS}.
 * The error is logged, not returned: the health route is public and an error
 * message can leak internals.
 */
async function runCheck(
  name: string,
  probe: () => Promise<void>,
): Promise<CheckResult> {
  const started = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`timed out after ${CHECK_TIMEOUT_MS}ms`))
        }, CHECK_TIMEOUT_MS)
      }),
    ])
    return { ok: true, ms: Date.now() - started }
  } catch (error) {
    console.error(`[health] ${name} check failed`, error)
    return { ok: false, ms: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

/** Runs every check in parallel. `degraded` if any one fails. */
export async function checkHealth(
  probes: Record<string, () => Promise<void>>,
): Promise<HealthReport> {
  const entries = await Promise.all(
    Object.entries(probes).map(async ([name, probe]) => {
      return [name, await runCheck(name, probe)] as const
    }),
  )
  const checks = Object.fromEntries(entries)
  const status = entries.every(([, r]) => r.ok) ? 'ok' : 'degraded'
  return { status, checks }
}

/** The app's real dependencies: its D1 and the workflows Worker. */
export function appProbes(): Record<string, () => Promise<void>> {
  return {
    db: async () => {
      const db = cfEnv().DB
      if (!db) throw new Error('no DB binding')
      await db.prepare('select 1').first()
    },
    workflows: async () => {
      const binding = cfEnv().WORKFLOWS
      // `next dev` may run without the service binding — the HTTP fallback.
      // eslint-disable-next-line no-process-env
      const base = process.env.WORKFLOWS_URL ?? 'http://localhost:8787'
      const res = binding
        ? await binding.fetch('https://workflows/health')
        : await fetch(`${base}/health`)
      if (!res.ok) throw new Error(`workflows /health returned ${res.status}`)
    },
  }
}
