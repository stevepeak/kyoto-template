/**
 * Unauthenticated-route inventory: every HTTP handler exported from
 * `apps/web/app/api/**\/route.ts` must either be wrapped in an authenticating
 * factory (`AUTH_WRAPPERS`) or be listed in `UNWRAPPED_API_ROUTES` below with
 * the reason it is safe — how it gates itself, or why it is public.
 *
 * A new route fails CI here until someone has decided how it is protected,
 * instead of shipping open by omission. An entry whose route is gone fails too,
 * so the list cannot quietly outgrow the code.
 *
 * Run: `bun scripts/check-api-auth.ts` (also `bun run check:api-auth`).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_DIR = fileURLToPath(new URL('../apps/web/app/api', import.meta.url))

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type Method = (typeof METHODS)[number]

/** Factories that reject a request without a verified caller. */
const AUTH_WRAPPERS = ['createWfMcpRoute']

/** `route` is the URL path with Next's segment syntax, e.g. `/api/avatar/[userId]/[id]`. */
const UNWRAPPED_API_ROUTES: {
  route: string
  methods: Method[]
  reason: string
}[] = [
  {
    route: '/api/auth/[...all]',
    methods: ['GET', 'POST'],
    reason: 'better-auth itself',
  },
  {
    route: '/api/trpc/[trpc]',
    methods: ['GET', 'POST'],
    reason: 'each procedure gates itself (protectedProcedure)',
  },
  {
    route: '/api/avatar',
    methods: ['POST', 'DELETE'],
    reason: 'checks getSession inline and 401s without one',
  },
  {
    route: '/api/avatar/[userId]/[id]',
    methods: ['GET'],
    reason:
      'avatars are public by design (unguessable keys, <img> without credentials)',
  },
  {
    route: '/api/health',
    methods: ['GET'],
    reason: 'uptime probe; returns probe status only',
  },
  {
    route: '/api/mcp',
    methods: ['POST'],
    reason: 'handleAppMcpRequest verifies its own OAuth bearer token',
  },
  {
    route: '/api/mcp/metadata',
    methods: ['GET'],
    reason: 'RFC 9728 protected-resource metadata; public by spec',
  },
  {
    route: '/api/unsubscribe',
    methods: ['GET', 'POST'],
    reason: 'bearer of a signed per-user unsubscribe token',
  },
  {
    route: '/api/well-known/[doc]',
    methods: ['GET'],
    reason: 'OAuth/OIDC discovery documents; public by spec',
  },
  {
    route: '/api/wf',
    methods: ['POST'],
    reason: '007 handlers call resolveContext before dispatch',
  },
  {
    route: '/api/wf/connectors/callback',
    methods: ['GET'],
    reason: 'OAuth callback; resolveContext requires a session',
  },
]

interface ApiHandler {
  route: string
  method: Method
  /** The authenticating wrapper, or null when the handler is unwrapped. */
  wrapper: string | null
  isListed: boolean
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('route.ts'))
    .map((path) => join(dir, path))
}

function exportedHandlers(
  source: string,
): { method: Method; wrapper: string | null }[] {
  const found: { method: Method; wrapper: string | null }[] = []
  for (const method of METHODS) {
    const assigned = new RegExp(
      String.raw`^export const ${method}\s*=\s*([A-Za-z]+)(<[^>]*>)?\(`,
      'm',
    ).exec(source)
    if (assigned) {
      const name = assigned[1]
      found.push({
        method,
        wrapper: AUTH_WRAPPERS.includes(name) ? name : null,
      })
      continue
    }
    const declared =
      new RegExp(String.raw`^export (async )?function ${method}\b`, 'm').test(
        source,
      ) ||
      new RegExp(String.raw`^export \{[^}]*\bas ${method}\b`, 'm').test(source)
    if (declared) found.push({ method, wrapper: null })
  }
  return found
}

function listApiRoutes(): ApiHandler[] {
  return routeFiles(API_DIR).flatMap((file) => {
    const route =
      `/api/${relative(API_DIR, file).replace(/\/?route\.ts$/, '')}`.replace(
        /\/$/,
        '',
      )
    const entry = UNWRAPPED_API_ROUTES.find((p) => p.route === route)
    return exportedHandlers(readFileSync(file, 'utf8')).map(
      ({ method, wrapper }) => ({
        route,
        method,
        wrapper,
        isListed: entry?.methods.includes(method) ?? false,
      }),
    )
  })
}

/** Every handler that is neither wrapped nor listed, and every stale entry. */
function findApiAuthProblems(handlers: ApiHandler[]): string[] {
  const problems: string[] = []
  for (const h of handlers) {
    if (!h.wrapper && !h.isListed) {
      problems.push(
        `${h.method} ${h.route} is not wrapped in ${AUTH_WRAPPERS.join('/')} and is not in UNWRAPPED_API_ROUTES`,
      )
    }
  }
  for (const p of UNWRAPPED_API_ROUTES) {
    for (const method of p.methods) {
      if (!handlers.some((h) => h.route === p.route && h.method === method)) {
        problems.push(
          `UNWRAPPED_API_ROUTES lists ${method} ${p.route}, which no longer exists`,
        )
      }
    }
  }
  return problems
}

const handlers = listApiRoutes()
const problems = findApiAuthProblems(handlers)

if (problems.length > 0) {
  console.error(`check-api-auth: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  console.error(
    '\nWrap the handler in an auth factory, or add it to UNWRAPPED_API_ROUTES with a reason (scripts/check-api-auth.ts).',
  )
  process.exit(1)
}
const wrapped = handlers.filter((h) => h.wrapper).length
console.log(
  `check-api-auth: ${handlers.length} handlers, ${wrapped} wrapped, ${handlers.length - wrapped} reviewed in UNWRAPPED_API_ROUTES`,
)
