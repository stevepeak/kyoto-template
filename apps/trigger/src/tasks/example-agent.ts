import { createOpenAI } from '@ai-sdk/openai'
import { exampleAgent } from '@app/agents'
import { getConfig } from '@app/config'
import { logger, task } from '@trigger.dev/sdk'

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

    const config = getConfig()
    const openai = createOpenAI({
      apiKey: config.OPENAI_API_KEY,
    })
    const model = openai('gpt-4o-mini')

    const result = await exampleAgent({
      model: model as unknown as Parameters<typeof exampleAgent>[0]['model'],
      name,
    })

    logger.log('Example agent task completed', { result })

    return result
  },
})
