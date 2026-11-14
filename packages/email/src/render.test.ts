import { describe, expect, test } from 'bun:test'

import { EMAIL_PREVIEWS } from './previews'
import {
  renderPasskeyAddedEmail,
  renderPasswordResetEmail,
  renderVerifyEmail,
  renderWelcomeEmail,
} from './render'
import PasskeyAddedEmail from './templates/passkey-added'
import PasswordResetEmail from './templates/password-reset'
import VerifyEmail from './templates/verify-email'
import WelcomeEmail from './templates/welcome'

/** Code points react-email's `<Preview>` pads with. */
const ZERO_WIDTH = [0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0xfeff]

describe('renderWelcomeEmail', () => {
  test('greets by first name and links to the app', async () => {
    const mail = await renderWelcomeEmail(WelcomeEmail.PreviewProps)

    expect(mail.subject).toBe('Welcome to Acme Co')
    expect(mail.html).toContain('Welcome, Dana')
    expect(mail.html).toContain('href="https://app.example.com"')
    // The plain part is generated from the HTML, so a layout change can drop
    // content from it while the HTML still looks right.
    expect(mail.text).toContain('Welcome, Dana')
    expect(mail.text).toContain('https://app.example.com')
  })

  test('greets nobody when there is no name', async () => {
    const mail = await renderWelcomeEmail({
      ...WelcomeEmail.PreviewProps,
      name: '  ',
    })
    expect(mail.text).toContain('Welcome')
    expect(mail.text).not.toContain('Welcome,')
  })
})

describe('renderPasswordResetEmail', () => {
  test('carries the link and expiry in both parts', async () => {
    const mail = await renderPasswordResetEmail(PasswordResetEmail.PreviewProps)
    const { resetUrl } = PasswordResetEmail.PreviewProps

    expect(mail.subject).toBe('Reset your Acme Co password')
    expect(mail.html).toContain(resetUrl)
    expect(mail.text).toContain(resetUrl)
    expect(mail.text).toContain('60 minutes')
    expect(mail.text).toContain('has not been changed')
  })
})

describe('renderVerifyEmail', () => {
  test('carries the link and expiry in both parts', async () => {
    const mail = await renderVerifyEmail(VerifyEmail.PreviewProps)
    const { verifyUrl } = VerifyEmail.PreviewProps

    expect(mail.subject).toBe('Confirm your email for Acme Co')
    // The link has a query string; HTML attribute-escapes its `&`.
    expect(mail.html).toContain(verifyUrl.replaceAll('&', '&amp;'))
    expect(mail.text).toContain(verifyUrl)
    expect(mail.text).toContain('60 minutes')
  })
})

describe('renderPasskeyAddedEmail', () => {
  test('names the passkey, the time, and where to remove it', async () => {
    const mail = await renderPasskeyAddedEmail(PasskeyAddedEmail.PreviewProps)

    expect(mail.subject).toBe('A new passkey was added to your Acme Co account')
    expect(mail.text).toContain('MacBook Pro Touch ID')
    expect(mail.text).toContain('November 14, 2026')
    expect(mail.text).toContain('UTC')
    expect(mail.text).toContain('https://app.example.com/settings/security')
  })

  test('reads naturally without a passkey name', async () => {
    const mail = await renderPasskeyAddedEmail({
      ...PasskeyAddedEmail.PreviewProps,
      passkeyName: '  ',
    })
    expect(mail.text).toContain('A new passkey was added to your Acme Co')
  })
})

describe('EMAIL_PREVIEWS', () => {
  test('every variant renders, and ids are unique', async () => {
    const templateIds = EMAIL_PREVIEWS.map((p) => p.id)
    expect(new Set(templateIds).size).toBe(templateIds.length)

    for (const preview of EMAIL_PREVIEWS) {
      const variantIds = preview.variants.map((v) => v.id)
      expect(new Set(variantIds).size).toBe(variantIds.length)
      for (const variant of preview.variants) {
        const mail = await variant.render('https://app.example.com')
        expect(mail.subject.length).toBeGreaterThan(0)
        expect(mail.text.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('the preheader', () => {
  test('carries no zero-width padding, and stays out of the plain part', async () => {
    const mail = await renderPasswordResetEmail(PasswordResetEmail.PreviewProps)
    const preview = 'Choose a new password for Acme Co.'

    expect(mail.html).toContain(preview)
    for (const codePoint of ZERO_WIDTH) {
      expect(mail.html).not.toContain(String.fromCodePoint(codePoint))
    }
    expect(mail.text).not.toContain(preview)
  })
})
