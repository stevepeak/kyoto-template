import { type WorkflowInput, workflowInputs } from '@app/workflows-client'
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'

type Params = WorkflowInput<'drip-email'> & { runId?: string }

/**
 * Multi-day onboarding sequence — demonstrates `step.sleep` across long
 * durations. The workflow goes dormant between sleeps and resumes exactly
 * where it left off, with no compute charges for the idle time.
 */
export class DripEmail extends WorkflowEntrypoint<Env, Params> {
  override async run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<void> {
    const { userId, email } = workflowInputs['drip-email'].parse(event.payload)

    await step.do('day-0 welcome', async () => {
      await sendEmail(this.env, email, `Welcome aboard, ${userId}!`)
    })

    await step.sleep('wait one day', '1 day')
    await step.do('day-1 follow-up', async () => {
      await sendEmail(this.env, email, 'How are you finding things so far?')
    })

    await step.sleep('wait three days', '3 days')
    await step.do('day-4 tips', async () => {
      await sendEmail(this.env, email, 'Three power-user tips for you')
    })

    await step.sleep('wait one week', '7 days')
    await step.do('day-11 check-in', async () => {
      await sendEmail(
        this.env,
        email,
        'Quick check-in — anything we can help with?',
      )
    })
  }
}

async function sendEmail(env: Env, to: string, subject: string): Promise<void> {
  // Fan out via the notifications queue — same retry/DLQ semantics as any
  // other notification. Replace with a real provider (Resend, Postmark, etc.).
  await env.NOTIFICATIONS.send({
    kind: 'email',
    to,
    subject,
    sentAt: new Date().toISOString(),
  })
}
