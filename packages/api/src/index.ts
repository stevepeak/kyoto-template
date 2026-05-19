import { workflowInputs } from '@app/workflows-client'
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

// Routes a tRPC mutation onto a workflow. Keeps the public surface stable so
// the client (`useWorkflowRun`) just sees `{ runId, accessToken }`.
const workflowsRouter = router({
  helloWorld: publicProcedure
    .input(workflowInputs['hello-world'])
    .mutation(async ({ ctx, input }) => {
      return await ctx.workflows.startRun('hello-world', input)
    }),
  exampleAgent: publicProcedure
    .input(workflowInputs['example-agent'])
    .mutation(async ({ ctx, input }) => {
      return await ctx.workflows.startRun('example-agent', input)
    }),
})

export const appRouter = router({
  hello: helloRouter,
  workflows: workflowsRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
