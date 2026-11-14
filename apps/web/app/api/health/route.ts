import { appProbes, checkHealth } from '@/lib/health'

// Never cached: a monitor must see the live state.
export const dynamic = 'force-dynamic'

/**
 * Uptime/readiness probe: 200 when D1 and the workflows Worker answer, 503
 * otherwise. Public and cheap (one `select 1`, one internal fetch), so point
 * an uptime monitor or a post-deploy smoke check at it.
 */
export async function GET() {
  const report = await checkHealth(appProbes())
  return Response.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
