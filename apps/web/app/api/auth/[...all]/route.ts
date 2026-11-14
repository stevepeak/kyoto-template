import { toNextJsHandler } from 'better-auth/next-js'

import { getAuth } from '@/lib/auth'

// Auth is built per request (D1 is a request-scoped binding).
export async function GET(req: Request) {
  return await toNextJsHandler(getAuth()).GET(req)
}

export async function POST(req: Request) {
  return await toNextJsHandler(getAuth()).POST(req)
}
