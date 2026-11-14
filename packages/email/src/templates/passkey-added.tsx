import { Section } from '@react-email/components'

import { PRODUCT_NAME } from '../brand'
import { EmailLayout } from '../components/email-layout'
import { ActionLink, Heading, Paragraph } from '../components/primitives'

// TODO: placeholder copy — review wording with the product owner.

export interface PasskeyAddedEmailProps {
  /**
   * The label stored with the passkey (e.g. "MacBook Touch ID"). Null when the
   * browser offered none and the user typed none.
   */
  passkeyName: string | null
  /** When the passkey was registered. Rendered in UTC — we don't know theirs. */
  addedAt: Date
  /** Where passkeys are managed, e.g. `https://app.example.com/settings/security`. */
  settingsUrl: string
}

export function passkeyAddedSubject(): string {
  return `A new passkey was added to your ${PRODUCT_NAME} account`
}

function formatAddedAt(at: Date): string {
  // `dateStyle`/`timeStyle` can't be combined with `timeZoneName`, so the
  // zone is appended by hand.
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)
  return `${formatted} UTC`
}

/**
 * Security notice, not a confirmation. The person most in need of it is the
 * one who did NOT add the passkey, so the copy is written for them.
 */
export default function PasskeyAddedEmail({
  passkeyName,
  addedAt,
  settingsUrl,
}: PasskeyAddedEmailProps) {
  const label = passkeyName?.trim()
  return (
    <EmailLayout
      preview={`A passkey can now sign in to your ${PRODUCT_NAME} account.`}
    >
      <Heading>New passkey added</Heading>
      <Paragraph>
        {label ? (
          <>
            A passkey named <strong>{label}</strong> was added
          </>
        ) : (
          'A new passkey was added'
        )}{' '}
        to your {PRODUCT_NAME} account on {formatAddedAt(addedAt)}. It can now
        be used to sign in without a password.
      </Paragraph>
      <Paragraph>If this was you, there’s nothing else to do.</Paragraph>
      <Section style={{ marginTop: '8px' }}>
        <Paragraph>
          If it wasn’t, someone else may have access to your account. Remove the
          passkey and change your password straight away.
        </Paragraph>
      </Section>
      <ActionLink href={settingsUrl} label="Review passkeys" />
    </EmailLayout>
  )
}

/** What `email dev` renders the template with. Ships in the bundle — sample data only. */
PasskeyAddedEmail.PreviewProps = {
  passkeyName: 'MacBook Pro Touch ID',
  addedAt: new Date('2026-11-14T15:04:00Z'),
  settingsUrl: 'https://app.example.com/settings/security',
} satisfies PasskeyAddedEmailProps
