import { isNotificationEnabled, type NotificationCategory } from '@app/api'
import type { RenderedEmail } from '@app/email'

import { cfVar } from './cf-env'
import { getDb } from './db'
import { sendEmail } from './email'
import { resourceUrl } from './mcp-resources'
import { signUnsubscribeToken } from './unsubscribe-token'

/** Signs with the auth secret — one less secret to provision. */
function unsubscribeSecret(): string {
  const secret = cfVar('BETTER_AUTH_SECRET')
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set')
  return secret
}

export async function unsubscribeUrlFor(
  userId: string,
  category: NotificationCategory,
): Promise<string> {
  const token = await signUnsubscribeToken(
    { userId, category },
    unsubscribeSecret(),
  )
  return resourceUrl(`/unsubscribe?token=${encodeURIComponent(token)}`)
}

/**
 * Sends optional (non-security) mail: skips users who turned `category` off,
 * puts an unsubscribe link in the footer, and sets the `List-Unsubscribe` +
 * `List-Unsubscribe-Post` headers (RFC 8058) that Gmail and Yahoo require
 * from bulk senders and that give mail clients their "Unsubscribe" button.
 *
 * Security and account mail goes through `sendEmail` directly — it must not
 * be skippable.
 *
 * @public — the building block for product emails; nothing sends one yet.
 * @example
 * await sendNotificationEmail({
 *   user, category: 'tips',
 *   render: (unsubscribeUrl) =>
 *     renderWelcomeEmail({ name: user.name, appUrl, unsubscribeUrl }),
 * })
 */
export async function sendNotificationEmail({
  user,
  category,
  render,
}: {
  user: { id: string; email: string }
  category: NotificationCategory
  render: (unsubscribeUrl: string) => Promise<RenderedEmail>
}): Promise<'sent' | 'no-binding' | 'opted-out'> {
  if (!(await isNotificationEnabled(getDb(), user.id, category))) {
    return 'opted-out'
  }
  const pageUrl = await unsubscribeUrlFor(user.id, category)
  // The one-click endpoint takes the same token; mail clients POST to it.
  const oneClickUrl = pageUrl.replace('/unsubscribe?', '/api/unsubscribe?')
  const mail = await render(pageUrl)
  return await sendEmail({
    to: user.email,
    ...mail,
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}
