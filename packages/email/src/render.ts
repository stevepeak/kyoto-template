import { plainTextSelectors, render, toPlainText } from '@react-email/render'
import { createElement } from 'react'

import PasskeyAddedEmail, {
  type PasskeyAddedEmailProps,
  passkeyAddedSubject,
} from './templates/passkey-added'
import PasswordResetEmail, {
  type PasswordResetEmailProps,
  passwordResetSubject,
} from './templates/password-reset'
import VerifyEmail, {
  type VerifyEmailProps,
  verifyEmailSubject,
} from './templates/verify-email'
import WelcomeEmail, {
  type WelcomeEmailProps,
  welcomeSubject,
} from './templates/welcome'

/** A template rendered down to the three fields a mail transport needs. */
export interface RenderedEmail {
  subject: string
  html: string
  /**
   * The `text/plain` alternative. Never optional: a message with no plain part
   * scores worse with spam filters and renders as an empty body in clients
   * that prefer text.
   */
  text: string
}

/**
 * HTML → plain text, from the HTML we just rendered rather than by rendering
 * the tree a second time. `render(el, { plainText: true })` does exactly this
 * internally after re-running the React render; going straight to the
 * converter halves the work inside a request someone is waiting on.
 */
function asPlainText(html: string): string {
  return toPlainText(html, { selectors: plainTextSelectors })
}

export async function renderWelcomeEmail(
  props: WelcomeEmailProps,
): Promise<RenderedEmail> {
  const html = await render(createElement(WelcomeEmail, props))
  return { subject: welcomeSubject(), html, text: asPlainText(html) }
}

/**
 * Renders the password reset mail. `props.resetUrl` is a live credential — the
 * caller must never log it alongside a failure.
 */
export async function renderPasswordResetEmail(
  props: PasswordResetEmailProps,
): Promise<RenderedEmail> {
  const html = await render(createElement(PasswordResetEmail, props))
  return { subject: passwordResetSubject(), html, text: asPlainText(html) }
}

export async function renderPasskeyAddedEmail(
  props: PasskeyAddedEmailProps,
): Promise<RenderedEmail> {
  const html = await render(createElement(PasskeyAddedEmail, props))
  return { subject: passkeyAddedSubject(), html, text: asPlainText(html) }
}

/**
 * Renders the email-verification mail. `props.verifyUrl` signs the account in
 * — the caller must never log it alongside a failure.
 */
export async function renderVerifyEmail(
  props: VerifyEmailProps,
): Promise<RenderedEmail> {
  const html = await render(createElement(VerifyEmail, props))
  return { subject: verifyEmailSubject(), html, text: asPlainText(html) }
}
