import {
  renderPasskeyAddedEmail,
  type RenderedEmail,
  renderPasswordResetEmail,
  renderVerifyEmail,
  renderWelcomeEmail,
} from './render'
import PasskeyAddedEmail from './templates/passkey-added'
import PasswordResetEmail from './templates/password-reset'
import VerifyEmail from './templates/verify-email'
import WelcomeEmail from './templates/welcome'

/**
 * The catalogue behind the in-app email gallery (`/emails`).
 *
 * Why this exists next to `email dev` rather than instead of it: the react-email
 * preview server reads `.tsx` off disk with a file watcher, so it is a local
 * development tool and cannot be deployed — there is no disk in a Worker. This
 * renders the same templates through the same render functions on the deployed
 * origin.
 *
 * Each entry's FIRST variant is built straight from the template's
 * `PreviewProps`, so `email dev` and the deployed gallery show the same mail
 * from one fixture. The remaining variants are the cases that actually differ
 * in the output.
 */

export interface EmailPreviewVariant {
  /** Stable id, unique within its template. Used as the selection key. */
  id: string
  /** Short label for the picker — names the case, not the template. */
  label: string
  /** What makes this case different, and why it is worth looking at. */
  description: string
  /**
   * Renders this case. `appUrl` is the origin the mail's links are built
   * against — passed in because this package has no environment to read.
   */
  render: (appUrl: string) => Promise<RenderedEmail>
}

export interface EmailPreview {
  id: string
  /** The mail's name, as the product would refer to it. */
  name: string
  /** What the mail is for, in one line. */
  description: string
  /** What causes it to be sent. */
  sentWhen: string
  variants: EmailPreviewVariant[]
}

const welcome = WelcomeEmail.PreviewProps
const reset = PasswordResetEmail.PreviewProps
const passkey = PasskeyAddedEmail.PreviewProps
const verify = VerifyEmail.PreviewProps

export const EMAIL_PREVIEWS: EmailPreview[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Greets a new account and links back into the app.',
    sentWhen: 'Not sent yet — wiring it to sign-up is a product decision.',
    variants: [
      {
        id: 'named',
        label: 'With a name',
        description: 'Greets by first name. The default fixture.',
        render: (appUrl) => renderWelcomeEmail({ ...welcome, appUrl }),
      },
      {
        id: 'no-name',
        label: 'No name',
        description:
          'The account has no display name, so the greeting addresses nobody.',
        render: (appUrl) => renderWelcomeEmail({ name: null, appUrl }),
      },
    ],
  },
  {
    id: 'verify-email',
    name: 'Verify email',
    description:
      'Carries the one-time link that confirms the address and signs the new account in.',
    sentWhen:
      'Someone signs up with email/password, or tries to sign in before confirming.',
    variants: [
      {
        id: 'default',
        label: 'Verification link',
        description: 'A sample token — the real one is a live credential.',
        render: (appUrl) => {
          return renderVerifyEmail({
            ...verify,
            verifyUrl: `${appUrl}/api/auth/verify-email?token=sample-token&callbackURL=/verify-email`,
          })
        },
      },
    ],
  },
  {
    id: 'password-reset',
    name: 'Password reset',
    description:
      'Carries the one-time reset link. Says the password has not changed, for whoever did not ask.',
    sentWhen: 'Someone asks to reset the password on the login page.',
    variants: [
      {
        id: 'default',
        label: 'Reset link',
        description: 'A sample token — the real one is a live credential.',
        render: (appUrl) => {
          return renderPasswordResetEmail({
            ...reset,
            resetUrl: `${appUrl}/api/auth/reset-password/sample-token?callbackURL=/reset-password`,
          })
        },
      },
    ],
  },
  {
    id: 'passkey-added',
    name: 'Passkey added',
    description:
      'Security notice that a new passkey can sign in to the account — written for the person who did not add it.',
    sentWhen: 'A passkey is registered from Settings.',
    variants: [
      {
        id: 'named',
        label: 'Named passkey',
        description: 'The passkey has a label. The default fixture.',
        render: (appUrl) => {
          return renderPasskeyAddedEmail({
            ...passkey,
            settingsUrl: `${appUrl}/settings/security`,
          })
        },
      },
      {
        id: 'unnamed',
        label: 'Unnamed passkey',
        description:
          'Neither the browser nor the user gave it a label, so the copy cannot name it.',
        render: (appUrl) => {
          return renderPasskeyAddedEmail({
            ...passkey,
            passkeyName: null,
            settingsUrl: `${appUrl}/settings/security`,
          })
        },
      },
    ],
  },
]

/** Looks up one variant. Returns null for an id pair that does not exist. */
export function findEmailPreviewVariant(
  templateId: string,
  variantId: string,
): EmailPreviewVariant | null {
  const template = EMAIL_PREVIEWS.find((p) => p.id === templateId)
  return template?.variants.find((v) => v.id === variantId) ?? null
}
