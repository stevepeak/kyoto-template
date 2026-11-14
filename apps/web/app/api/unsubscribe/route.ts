import { NOTIFICATION_CATEGORIES, setNotificationPreference } from '@app/api'

import { cfVar } from '@/lib/cf-env'
import { getDb } from '@/lib/db'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

/**
 * Unsubscribe from one email category with a signed token (no sign-in).
 *
 * - POST: RFC 8058 one-click — what Gmail/Apple Mail call from the
 *   `List-Unsubscribe` header, and what the /unsubscribe page's button calls.
 * - GET: sends a browser to the /unsubscribe confirmation page instead of
 *   acting, because link scanners and previewers GET every link in a mail.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const secret = cfVar('BETTER_AUTH_SECRET')
  const payload = secret ? await verifyUnsubscribeToken(token, secret) : null
  if (!payload) {
    return Response.json({ error: 'invalid_token' }, { status: 400 })
  }
  await setNotificationPreference(
    getDb(),
    payload.userId,
    payload.category,
    false,
  )
  return Response.json({
    ok: true,
    category: NOTIFICATION_CATEGORIES[payload.category].label,
  })
}

export function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/unsubscribe'
  return Response.redirect(url, 303)
}
