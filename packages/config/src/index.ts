import { z } from 'zod'

// Two schemas, deliberately separate:
//
//   envSchema       — what a **Worker** may read at runtime. Every Cloudflare
//                     service the Workers touch (D1, Email, Workflows) is
//                     reached through a binding, so no Cloudflare API
//                     credential belongs in here.
//   scriptEnvSchema — what **CLI/CI scripts** need. They run outside a Worker,
//                     have no bindings, and talk to D1 over its REST API, so
//                     they need an account-scoped token.

/**
 * A variable that may be absent entirely *or* present-but-empty.
 *
 * `.env` and `wrangler.jsonc` vars make `""` the natural way to write "not set
 * yet". Treating `""` as absent keeps one placeholder from taking the whole
 * Worker down instead of just disabling the feature it belongs to.
 */
function optionalNonEmpty() {
  return z.preprocess((value) => {
    return typeof value === 'string' && value.trim() === '' ? undefined : value
  }, z.string().min(1).optional())
}

const envSchema = z.object({
  APP_URL: z
    .url()
    .transform((value) => value.replace(/\/+$/, ''))
    .default('http://localhost:3000'),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(1, 'BETTER_AUTH_SECRET is required')
    .describe(
      'Secret key for Better Auth encryption/decryption. Generate with: openssl rand -base64 32',
    ),

  // Google OAuth client — "Sign in with Google". Both optional; the provider
  // (and its button) is left out when either is missing. The secret is a
  // SECRET: `wrangler secret put GOOGLE_CLIENT_SECRET`.
  // TODO: create the OAuth client (redirect URI: {APP_URL}/api/auth/callback/google).
  GOOGLE_CLIENT_ID: optionalNonEmpty().describe(
    'Google Cloud console → APIs & Services → Credentials → OAuth client ID',
  ),
  GOOGLE_CLIENT_SECRET: optionalNonEmpty().describe(
    'Google Cloud console → the OAuth client → client secret',
  ),

  // Outbound email (Cloudflare Email Sending `EMAIL` binding). The sender must
  // also be listed in `send_email[].allowed_sender_addresses` in wrangler.jsonc.
  // TODO: choose the sending domain/address and display name.
  EMAIL_FROM: optionalNonEmpty().describe('e.g. noreply@your-domain.com'),
  EMAIL_FROM_NAME: optionalNonEmpty().describe('Display name for EMAIL_FROM'),

  // Cloudflare Workflows worker. Production reaches it through the service
  // binding; this URL is only the `next dev` HTTP fallback.
  WORKFLOWS_URL: z
    .url()
    .default('http://localhost:8787')
    .describe(
      'Base URL of the template-workflows worker — used by the server in dev',
    ),
  NEXT_PUBLIC_WORKFLOWS_URL: z
    .url()
    .default('http://localhost:8787')
    .describe(
      'Browser-visible URL of the workflows worker for SSE/WebSocket subscriptions',
    ),
  TOKEN_SIGNING_KEY: optionalNonEmpty().describe(
    'HMAC key used to sign per-run access tokens. Generate with: openssl rand -base64 32',
  ),

  // AI
  // TODO: decide which model provider(s) the app uses and make those required.
  OPENROUTER_API_KEY: optionalNonEmpty(),

  // 007 — seals stored MCP-connector OAuth tokens. Optional: unset disables
  // connectors. Must be identical on both Workers.
  WF_CONNECTOR_KEY: optionalNonEmpty().describe(
    'Generate with: openssl rand -base64 32',
  ),

  // Sentry
  // TODO: decide whether Sentry is required (and wire @sentry/cloudflare).
  SENTRY_DSN: optionalNonEmpty(),

  // PostHog
  // TODO: decide whether PostHog is required.
  POSTHOG_API_KEY: optionalNonEmpty(),
  POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
})

export type ParsedEnv = z.infer<typeof envSchema>

/**
 * Get environment variables
 * Usage
 * ```ts
 * import { getConfig } from '@app/config'
 * const { APP_URL } = getConfig()
 * ```
 */
export function getConfig(
  environmentVariables?: Record<string, string | undefined>,
): ParsedEnv {
  // eslint-disable-next-line no-process-env
  const env = environmentVariables ?? process.env

  // Normalize public env vars to secret env vars
  const normalizedEnv = {
    ...env,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY ?? env.NEXT_PUBLIC_POSTHOG_API_KEY,
    POSTHOG_HOST: env.POSTHOG_HOST ?? env.NEXT_PUBLIC_POSTHOG_HOST,
    SENTRY_DSN: env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN,
    APP_URL: env.APP_URL ?? env.NEXT_PUBLIC_APP_URL,
  }

  return envSchema.parse(normalizedEnv)
}

const scriptEnvSchema = z.object({
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_API_TOKEN: z
    .string()
    .min(1)
    .describe('Cloudflare API token with D1:Edit'),
  D1_DATABASE_ID: z.string().min(1).describe('id of the app D1 (template-db)'),
})

export type ScriptEnv = z.infer<typeof scriptEnvSchema>

/** Env for CLI/CI scripts that reach D1 over the REST API (`createDbHttp`). */
export function getScriptConfig(
  environmentVariables?: Record<string, string | undefined>,
): ScriptEnv {
  // eslint-disable-next-line no-process-env
  return scriptEnvSchema.parse(environmentVariables ?? process.env)
}
