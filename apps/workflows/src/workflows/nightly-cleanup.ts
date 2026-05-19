import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'

type Params = { triggeredAt: number }

/**
 * Cron-driven cleanup workflow. Wrangler's `triggers.crons` schedule fires
 * the Worker `scheduled()` handler (see src/index.ts), which spawns one
 * instance of this workflow per scheduled run.
 *
 * Locally: `wrangler dev --test-scheduled` then
 *   curl 'http://localhost:8787/__scheduled?cron=0+3+*+*+*'
 */
export class NightlyCleanup extends WorkflowEntrypoint<Env, Params> {
  override async run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<{ scanned: number; queued: number }> {
    const stale = await step.do(
      'find-stale-records',
      { retries: { limit: 3, delay: '10 second', backoff: 'exponential' } },
      async () => {
        // Replace with a real query against D1 / your database.
        return [{ userId: 'demo-user-1' }, { userId: 'demo-user-2' }]
      },
    )

    const queued = await step.do('enqueue-cleanup-jobs', async () => {
      for (const record of stale) {
        await this.env.NOTIFICATIONS.send({
          kind: 'cleanup',
          userId: record.userId,
          scheduledAt: event.payload.triggeredAt,
        })
      }
      return stale.length
    })

    return { scanned: stale.length, queued }
  }
}
