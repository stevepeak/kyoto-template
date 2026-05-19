import { appRouter } from '@app/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { getWorkflowsClient } from '@/lib/workflows'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ workflows: getWorkflowsClient() }),
  })

export { handler as GET, handler as POST }
