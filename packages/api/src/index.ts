import { workflowInputs } from '@app/workflows-client'
import { z } from 'zod'

import { chatRouter } from './chat'
import { notificationsRouter } from './notifications'
import {
  createCallerFactory,
  protectedProcedure,
  publicProcedure,
  router,
} from './trpc'

export type { Context, SessionUser } from './context'
export {
  isNotificationEnabled,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  notificationCategorySchema,
  setNotificationPreference,
} from './notifications'

const meRouter = router({
  /** The signed-in user. Also backs the MCP `whoami` tool. */
  whoami: protectedProcedure.query(({ ctx }) => {
    return { user: ctx.user }
  }),
})

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
  me: meRouter,
  hello: helloRouter,
  workflows: workflowsRouter,
  notifications: notificationsRouter,
  chat: chatRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter

/** Server-side caller (route handlers, the app MCP). */
export const createCaller = createCallerFactory(appRouter)
