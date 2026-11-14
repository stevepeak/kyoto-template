import { Section } from '@react-email/components'

import { PRODUCT_NAME } from '../brand'
import { EmailLayout } from '../components/email-layout'
import { ActionLink, Heading, Paragraph } from '../components/primitives'

// TODO: placeholder copy — review wording with the product owner.

export interface VerifyEmailProps {
  /**
   * The one-time verification link minted by Better Auth. Opening it signs the
   * account in, so it is a LIVE CREDENTIAL — never log it alongside a failure.
   */
  verifyUrl: string
  /** How long `verifyUrl` stays valid, in minutes. */
  expiresInMinutes: number
}

export function verifyEmailSubject(): string {
  return `Confirm your email for ${PRODUCT_NAME}`
}

export default function VerifyEmail({
  verifyUrl,
  expiresInMinutes,
}: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email to finish signing up.">
      <Heading>Confirm your email</Heading>
      <Paragraph>
        Thanks for signing up for {PRODUCT_NAME}. Confirm this is your email
        address to finish creating your account.
      </Paragraph>
      <ActionLink href={verifyUrl} label="Confirm email" />
      <Section style={{ marginTop: '24px' }}>
        <Paragraph>
          The link expires in {expiresInMinutes} minutes. If you didn’t sign up,
          you can ignore this email — the account can’t be used until the
          address is confirmed.
        </Paragraph>
      </Section>
    </EmailLayout>
  )
}

/** What `email dev` renders the template with. Ships in the bundle — sample data only. */
VerifyEmail.PreviewProps = {
  verifyUrl:
    'https://app.example.com/api/auth/verify-email?token=sample-token&callbackURL=/verify-email',
  expiresInMinutes: 60,
} satisfies VerifyEmailProps
