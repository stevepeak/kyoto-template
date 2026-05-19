import { z } from 'zod'

const envSchema = z.object({
  APP_URL: z
    .string()
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

  // Database
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      'DATABASE_URL must start with postgres:// or postgresql://',
    ),

  // Cloudflare Workflows worker (replaces Trigger.dev)
  WORKFLOWS_URL: z
    .string()
    .url()
    .default('http://localhost:8787')
    .describe(
      'Base URL of the kyoto-workflows worker — used by the server in dev',
    ),
  NEXT_PUBLIC_WORKFLOWS_URL: z
    .string()
    .url()
    .default('http://localhost:8787')
    .describe(
      'Browser-visible URL of the workflows worker for SSE/WebSocket subscriptions',
    ),
  TOKEN_SIGNING_KEY: z
    .string()
    .min(32)
    .describe(
      'HMAC key used to sign per-run access tokens. Generate with: openssl rand -base64 32',
    ),

  // AI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENROUTER_API_KEY: z.string().startsWith('sk-or-v1-'),
  OPENROUTER_PROVISION_KEY: z.string().startsWith('sk-or-v1-'),
  AI_GATEWAY_API_KEY: z.string().startsWith('vck_'),

  // Sentry
  SENTRY_DSN: z.string().startsWith('https://'),

  // PostHog
  POSTHOG_API_KEY: z.string().min(1),
  POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
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
  environmentVariables?: Record<string, string>,
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
