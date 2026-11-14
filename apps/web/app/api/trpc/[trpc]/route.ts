import { appRouter } from '@app/api'
import * as Sentry from '@sentry/nextjs'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { getDb } from '@/lib/db'
import { readSessionUser } from '@/lib/session'
import { getWorkflowsClient } from '@/lib/workflows'

async function handler(req: Request) {
  const db = getDb()
  const user = await readSessionUser(req, db)
  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ db, user, workflows: getWorkflowsClient() }),
    // tRPC turns a thrown error into a 500 response itself, so it never
    // reaches Next's `onRequestError`. Report the unexpected ones; expected
    // failures (UNAUTHORIZED, BAD_REQUEST, …) aren't bugs.
    onError: ({ error, path }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        Sentry.captureException(error.cause ?? error, {
          tags: { 'trpc.path': path ?? 'unknown' },
        })
      }
    },
  })
}

export { handler as GET, handler as POST }
