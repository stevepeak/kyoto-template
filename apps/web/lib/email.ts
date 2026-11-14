import { PRODUCT_NAME } from './brand'
import { cfEnv, cfVar } from './cf-env'

/** A rendered message (see `@app/email`), ready to hand to the binding. */
type OutboundEmail = {
  to: string
  subject: string
  /** Always send both parts — some clients render only `text`, and an
   *  HTML-only message scores worse with spam filters. */
  html: string
  text: string
  replyTo?: string
}

/**
 * What {@link sendEmail} did. `no-binding` is not an error: Cloudflare ships no
 * local simulator for Email Sending, so `next dev` has no working `EMAIL`
 * binding, and until `EMAIL_FROM` is configured nothing can be sent anyway.
 */
type SendOutcome = 'sent' | 'no-binding'

/**
 * Send one transactional email through Cloudflare Email Sending.
 *
 * Needs both the `EMAIL` binding (wrangler.jsonc `send_email`) and `EMAIL_FROM`,
 * which must be listed in that binding's `allowed_sender_addresses` and sit on
 * a domain onboarded to Email Sending. With either missing the message is
 * logged instead — body and all, so a reset link is recoverable from the dev
 * console (or Workers logs, before a sender is configured).
 *
 * Throws on a real delivery failure, and on a CR/LF in any header field.
 */
export async function sendEmail(email: OutboundEmail): Promise<SendOutcome> {
  const from = cfVar('EMAIL_FROM')
  const fromName = cfVar('EMAIL_FROM_NAME') ?? PRODUCT_NAME
  assertNoHeaderBreaks([email.to, email.subject, email.replyTo ?? ''])

  const binding = cfEnv().EMAIL
  if (!binding || !from) {
    console.warn(
      '[email] no EMAIL binding or EMAIL_FROM configured — not sending.\n' +
        `  to:      ${email.to}\n` +
        `  subject: ${email.subject}\n` +
        email.text,
    )
    return 'no-binding'
  }
  assertNoHeaderBreaks([from, fromName])

  await binding.send({
    to: email.to,
    from: { email: from, name: fromName },
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
  })
  return 'sent'
}

/**
 * A CR or LF in a header field could end the header and start a new one
 * (`Bcc:`). Subjects and names can carry user text, so refuse rather than
 * trusting every caller to strip.
 */
function assertNoHeaderBreaks(fields: string[]): void {
  if (fields.some((field) => /[\r\n]/.test(field))) {
    throw new Error('Line break in a mail header field')
  }
}
