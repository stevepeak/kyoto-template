import { isGoogleEnabled, turnstileSiteKey } from './auth'
import { PRODUCT_NAME } from './brand'
import { cfEnv, cfVar } from './cf-env'
import { PRIVACY_POLICY } from './legal/privacy-policy'
import { TERMS_OF_USE } from './legal/terms-of-use'
import { configuredAppUrl } from './mcp-resources'

/** The template's placeholder name, so the check notices it was changed. */
const TEMPLATE_PRODUCT_NAME = 'Acme Co'

export type SetupItem = {
  id: string
  title: string
  /** What it gets you, in a line. */
  why: string
  /** What to do — where the setting lives and what to put there. */
  how: string
  done: boolean
  /** Launch-blocking, versus a feature that's simply off until configured. */
  required: boolean
}

/**
 * What the owner of a project made from this template still has to set up,
 * read from THIS deployment's live config — so `next dev` reports the local
 * `.env` / `.dev.vars`, and production reports its own vars and secrets.
 *
 * Only things the running app can actually observe are listed; a check that
 * can't see the real state would be a guess dressed up as a status.
 */
export function getSetupChecklist(): SetupItem[] {
  const env = process.env
  const appUrl = configuredAppUrl() ?? cfVar('APP_URL')
  const callbackBase = appUrl ?? 'https://your-domain.com'
  const hasTodo = (doc: unknown) => JSON.stringify(doc).includes('[TODO')

  return [
    {
      id: 'product-name',
      title: 'Product name',
      why: 'Shown on the sign-in consent screen, legal pages and every email.',
      how: 'Set PRODUCT_NAME in apps/web/lib/brand.ts.',
      done: PRODUCT_NAME !== TEMPLATE_PRODUCT_NAME,
      required: true,
    },
    {
      id: 'app-url',
      title: 'App URL',
      why: 'The public origin — used for auth callbacks, email links and MCP URLs.',
      how: 'Set APP_URL in wrangler.jsonc vars (and in .env for local builds).',
      done: Boolean(appUrl),
      required: true,
    },
    {
      id: 'auth-secret',
      title: 'Auth secret',
      why: 'Signs sessions and encrypts stored OAuth tokens.',
      how: 'Generate with `openssl rand -base64 32`, then `wrangler secret put BETTER_AUTH_SECRET`.',
      done: Boolean(cfVar('BETTER_AUTH_SECRET')),
      required: true,
    },
    {
      id: 'email',
      title: 'Email sending',
      why: 'Sign-up confirmation, password resets and security notices. Email/password sign-ups can’t finish without it — until set, emails are only logged.',
      how: 'Onboard a domain to Cloudflare Email Sending, set EMAIL_FROM (and EMAIL_FROM_NAME) in wrangler.jsonc, and list the address in send_email.allowed_sender_addresses.',
      done: Boolean(cfEnv().EMAIL && cfVar('EMAIL_FROM')),
      required: true,
    },
    {
      id: 'legal',
      title: 'Terms & privacy policy',
      why: 'The bundled documents are placeholders with [TODO] gaps.',
      how: 'Complete apps/web/lib/legal/terms-of-use.ts and privacy-policy.ts, and have counsel review them.',
      done: !hasTodo(TERMS_OF_USE) && !hasTodo(PRIVACY_POLICY),
      required: true,
    },
    {
      id: 'workflow-admins',
      title: 'Workflow admins',
      why: 'Who may open the 007 workflow console. In production nobody can until this is set.',
      how: 'Set WF_ADMIN_EMAILS (comma-separated) in wrangler.jsonc vars.',
      done: Boolean(cfVar('WF_ADMIN_EMAILS')),
      required: true,
    },
    {
      id: 'turnstile',
      title: 'Bot protection (Turnstile)',
      why: 'Stops scripted sign-ups, password guessing and reset-email spam. Free with a Cloudflare account.',
      how: 'Cloudflare dashboard → Turnstile → Add widget (Managed) for your hostname. Set TURNSTILE_SITE_KEY in wrangler.jsonc vars and `wrangler secret put TURNSTILE_SECRET_KEY`.',
      done: turnstileSiteKey() !== null,
      required: false,
    },
    {
      id: 'google',
      title: 'Google sign-in',
      why: 'Adds "Continue with Google" to the login page.',
      how: `Create an OAuth client in Google Cloud (redirect URI ${callbackBase}/api/auth/callback/google). Set GOOGLE_CLIENT_ID in wrangler.jsonc and \`wrangler secret put GOOGLE_CLIENT_SECRET\`.`,
      done: isGoogleEnabled(),
      required: false,
    },
    {
      id: 'posthog',
      title: 'PostHog analytics',
      why: 'Product analytics in the browser, and server events such as MCP tool calls.',
      how: '`wrangler secret put POSTHOG_API_KEY` for server events, and NEXT_PUBLIC_POSTHOG_API_KEY at build time for the browser.',
      done: Boolean(
        cfVar('POSTHOG_API_KEY') && env.NEXT_PUBLIC_POSTHOG_API_KEY,
      ),
      required: false,
    },
    {
      id: 'ai',
      title: 'AI model provider',
      why: 'Lets workflows and agents call a model.',
      how: '`wrangler secret put OPENROUTER_API_KEY`.',
      done: Boolean(cfVar('OPENROUTER_API_KEY')),
      required: false,
    },
    {
      id: 'wf-connectors',
      title: 'Workflow connectors key',
      why: 'Seals the OAuth tokens workflow connectors store. Connectors are off without it.',
      how: 'Generate with `openssl rand -base64 32`, then `wrangler secret put WF_CONNECTOR_KEY` on BOTH the web and workflows Workers.',
      done: Boolean(cfVar('WF_CONNECTOR_KEY')),
      required: false,
    },
  ]
}
