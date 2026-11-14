import { getAuth } from '@/lib/auth'

/** The discovery documents Better Auth serves under `/api/auth/.well-known`. */
const DOCS = new Set(['oauth-authorization-server', 'openid-configuration'])

/**
 * `/.well-known/{oauth-authorization-server,openid-configuration}[/…]` lands
 * here via a next.config.js rewrite. A plain rewrite straight to
 * `/api/auth/.well-known/…` is not enough: the route handler still sees the
 * ORIGINAL url, and Better Auth matches on its path — so it 404s. Rebuild the
 * canonical URL and hand that to Better Auth instead.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ doc: string }> },
) {
  const { doc } = await params
  if (!DOCS.has(doc)) return new Response('not found', { status: 404 })
  const url = new URL(`/api/auth/.well-known/${doc}`, req.url)
  return await getAuth().handler(new Request(url, { headers: req.headers }))
}
