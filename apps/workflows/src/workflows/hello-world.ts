import { type WorkflowInput, workflowInputs } from '@app/workflows-client'
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'

type Params = WorkflowInput<'hello-world'> & { runId: string }

export class HelloWorld extends WorkflowEntrypoint<Env, Params> {
  override async run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<{ message: string }> {
    const { runId, ...rest } = event.payload
    const { name = 'World' } = workflowInputs['hello-world'].parse(rest)

    const room = this.env.RUN_ROOM.get(this.env.RUN_ROOM.idFromName(runId))

    await step.do('greet', async () => {
      await room.setStatus('running')
      await room.append('progress', `Hello, ${name}!`)
    })

    await step.sleep('first pause', '5 seconds')
    await step.do('processing', async () => {
      await room.append('progress', 'Processing...')
    })

    await step.sleep('second pause', '5 seconds')
    await step.do('almost', async () => {
      await room.append('progress', 'Almost done...')
    })

    await step.sleep('final pause', '5 seconds')
    const result = await step.do('finalize', async () => {
      const message = `Hello, ${name}! This is a test task.`
      await room.append('progress', 'Complete!')
      await room.setOutput({ message })
      return { message }
    })

    return result
  }
}
