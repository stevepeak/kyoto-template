import { Section } from '@react-email/components'

import { PRODUCT_NAME } from '../brand'
import { EmailLayout } from '../components/email-layout'
import { ActionLink, Heading, Paragraph } from '../components/primitives'

// TODO: placeholder copy — review wording with the product owner.

export interface PasswordResetEmailProps {
  /**
   * The one-time reset link minted by Better Auth. A LIVE CREDENTIAL until it
   * expires — never log it alongside a failure.
   */
  resetUrl: string
  /** How long `resetUrl` stays valid, in minutes. */
  expiresInMinutes: number
}

export function passwordResetSubject(): string {
  return `Reset your ${PRODUCT_NAME} password`
}

export default function PasswordResetEmail({
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview={`Choose a new password for ${PRODUCT_NAME}.`}>
      <Heading>Reset your password</Heading>
      <Paragraph>
        Someone asked to reset the password for your {PRODUCT_NAME} account. Use
        the link below to choose a new one.
      </Paragraph>
      <ActionLink href={resetUrl} label="Reset password" />
      <Section style={{ marginTop: '24px' }}>
        <Paragraph>
          The link expires in {expiresInMinutes} minutes and can be used once.
          If you didn’t ask for this, you can ignore this email — your password
          has not been changed.
        </Paragraph>
      </Section>
    </EmailLayout>
  )
}

/** What `email dev` renders the template with. Ships in the bundle — sample data only. */
PasswordResetEmail.PreviewProps = {
  resetUrl: 'https://app.example.com/reset-password/sample-token',
  expiresInMinutes: 60,
} satisfies PasswordResetEmailProps
