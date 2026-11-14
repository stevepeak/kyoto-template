import { PRODUCT_NAME } from '../brand'
import { EmailLayout } from '../components/email-layout'
import { ActionLink, Heading, Paragraph } from '../components/primitives'

// TODO: placeholder copy — replace with the product's real welcome message.
// Nothing sends this yet; deciding when (and whether) a welcome mail goes out
// is a product decision. If it goes out as onboarding mail (the `tips`
// category), send it with `sendNotificationEmail` so it carries an
// unsubscribe link.

export interface WelcomeEmailProps {
  /** The new user's display name. Empty/null greets nobody by name. */
  name: string | null
  /** Origin of the app (`APP_URL`), e.g. `https://app.example.com`. */
  appUrl: string
  /** Set when sent as optional onboarding mail — see EmailLayout. */
  unsubscribeUrl?: string
}

/** First name only — how the greeting addresses someone. */
function firstNameOf(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0]
  return first && first.length > 0 ? first : null
}

export function welcomeSubject(): string {
  return `Welcome to ${PRODUCT_NAME}`
}

export default function WelcomeEmail({
  name,
  appUrl,
  unsubscribeUrl,
}: WelcomeEmailProps) {
  const first = firstNameOf(name)
  return (
    <EmailLayout
      preview={`Your ${PRODUCT_NAME} account is ready.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading>{first ? `Welcome, ${first}` : 'Welcome'}</Heading>
      <Paragraph>
        Your {PRODUCT_NAME} account is ready. Pick up where you left off any
        time from the link below.
      </Paragraph>
      <ActionLink href={appUrl} label={`Open ${PRODUCT_NAME}`} />
    </EmailLayout>
  )
}

/** What `email dev` renders the template with. Ships in the bundle — sample data only. */
WelcomeEmail.PreviewProps = {
  name: 'Dana Whitfield',
  appUrl: 'https://app.example.com',
} satisfies WelcomeEmailProps
