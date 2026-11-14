import { appRouter } from '@app/api'
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
  })
}

export { handler as GET, handler as POST }
