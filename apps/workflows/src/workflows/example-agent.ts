import { exampleAgent, type ExampleAgentOutput } from '@app/agents'
import { type WorkflowInput, workflowInputs } from '@app/workflows-client'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'

type Params = WorkflowInput<'example-agent'> & { runId: string }

export class ExampleAgent extends WorkflowEntrypoint<Env, Params> {
  override async run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<ExampleAgentOutput> {
    const { runId, ...rest } = event.payload
    const { name = 'World' } = workflowInputs['example-agent'].parse(rest)
    const room = this.env.RUN_ROOM.get(this.env.RUN_ROOM.idFromName(runId))

    await step.do('start', async () => {
      await room.setStatus('running')
      await room.append('progress', `Starting task for ${name}...`)
    })

    const result = await step.do(
      'call-openrouter',
      {
        retries: { limit: 3, delay: '2 second', backoff: 'exponential' },
        timeout: '2 minutes',
      },
      async () => {
        await room.append('progress', 'Initializing AI model...')

        if (!this.env.OPENROUTER_API_KEY) {
          throw new Error(
            'OPENROUTER_API_KEY is not set. Add it to your root .env (symlinked to apps/workflows/.dev.vars) or run `wrangler secret put OPENROUTER_API_KEY`.',
          )
        }

        const openrouter = createOpenRouter({
          apiKey: this.env.OPENROUTER_API_KEY,
        })
        const model = openrouter.chat('openai/gpt-4o-mini')

        try {
          const output = await exampleAgent({
            model: model as unknown as Parameters<
              typeof exampleAgent
            >[0]['model'],
            name,
          })
          await room.append('progress', 'Agent completed successfully!')
          return output
        } catch (err) {
          // Unwrap the AI SDK error so the workflow logs show OpenRouter's
          // actual status + body instead of "Provider returned error".
          const e = err as {
            statusCode?: number
            responseBody?: string
            url?: string
            message?: string
          }
          const detail = [
            e.statusCode ? `status=${e.statusCode}` : null,
            e.url ? `url=${e.url}` : null,
            e.responseBody ? `body=${e.responseBody}` : null,
            e.message ? `msg=${e.message}` : null,
          ]
            .filter(Boolean)
            .join(' | ')
          // eslint-disable-next-line no-console
          console.error('[example-agent] OpenRouter call failed:', detail, err)
          await room.append('progress', `OpenRouter error: ${detail}`)
          throw new Error(`OpenRouter call failed — ${detail}`)
        }
      },
    )

    await step.do('finalize', async () => {
      await room.setOutput(result)
    })

    return result
  }
}
