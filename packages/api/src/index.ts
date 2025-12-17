import { router, publicProcedure } from './trpc'
import { z } from 'zod'

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

export const appRouter = router({
  hello: helloRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
