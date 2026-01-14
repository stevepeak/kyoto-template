import { type exampleAgentTask } from '@app/trigger'
import { tasks } from '@trigger.dev/sdk'
import { z } from 'zod'

import { publicProcedure, router } from './trpc'

export type { Context } from './context'

const helloRouter = router({
  world: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        message: `Hello ${input.name ?? 'World'}!`,
      }
    }),
})

const triggerRouter = router({
  exampleAgent: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ input }) => {
      const handle = await tasks.trigger<typeof exampleAgentTask>(
        'example-agent',
        {
          name: input.name,
        },
      )

      return {
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken,
      }
    }),
})

export const appRouter = router({
  hello: helloRouter,
  trigger: triggerRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
