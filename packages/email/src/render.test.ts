import { describe, expect, test } from 'bun:test'

import { renderPasswordResetEmail, renderWelcomeEmail } from './render'
import PasswordResetEmail from './templates/password-reset'
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
