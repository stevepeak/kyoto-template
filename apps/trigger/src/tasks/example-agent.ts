import { createOpenAI } from '@ai-sdk/openai'
import { exampleAgent } from '@app/agents'
import { getConfig } from '@app/config'
import { logger, streams, task } from '@trigger.dev/sdk'

export const exampleAgentTask = task({
  id: 'example-agent',
  run: async (args: {
    name?: string
  }): Promise<{
    message: string
    timestamp: string
    data?: { count: number; items: string[] }
  }> => {
    const name = args.name ?? 'World'

    logger.log('Starting example agent task', { name })
    void streams.append('progress', `Starting task for ${name}...`)

    const config = getConfig()
    const openai = createOpenAI({
      apiKey: config.OPENAI_API_KEY,
    })
    const model = openai('gpt-4o-mini')

    void streams.append('progress', 'Initializing AI model...')

    const result = await exampleAgent({
      model: model as unknown as Parameters<typeof exampleAgent>[0]['model'],
      name,
    })

    void streams.append('progress', 'Agent completed successfully!')

    logger.log('Example agent task completed', { result })

    return result
  },
})
