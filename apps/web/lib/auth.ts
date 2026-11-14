import { type DB, schema } from '@app/db'
import { renderPasswordResetEmail } from '@app/email'
import { mcp } from '@better-auth/mcp'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { jwt, lastLoginMethod } from 'better-auth/plugins'

import { cfVar } from './cf-env'
import { getDb } from './db'
import { sendEmail } from './email'
import {
  APP_MCP_PATH,
  configuredAppUrl,
  isUsableResource,
  OAUTH_SCOPES,
  resourceUrl,
  WF_MCP_PATH,
} from './mcp-resources'

/**
 * Lifetime of a password-reset link. Passed to Better Auth AND rendered into
 * the email, so the number a reader is told is the number the server enforces.
 */
const RESET_PASSWORD_EXPIRES_IN_SECONDS = 60 * 60

/** Google is enabled only when both halves of the OAuth client are set. */
function googleConfig() {
  const clientId = cfVar('GOOGLE_CLIENT_ID')
  const clientSecret = cfVar('GOOGLE_CLIENT_SECRET')
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

/** Exposed to the login UI so it only shows the Google button when usable. */
export function isGoogleEnabled(): boolean {
  return googleConfig() !== null
}

/**
 * Builds a request-scoped Better Auth instance bound to the D1 database.
 *
 * The Drizzle adapter needs a live DB, and D1 is only available per-request —
 * so auth is constructed per call rather than as a module-level singleton.
 * Pass an existing `db` to share the handle with the rest of the request.
 */
export function getAuth(db: DB = getDb()) {
  const google = googleConfig()
  const wfResource = resourceUrl(WF_MCP_PATH)
  const appResource = resourceUrl(APP_MCP_PATH)

  return betterAuth({
    // With no APP_URL (e.g. no .env), fall back to loopback in dev — an empty
    // base URL makes Better Auth's plugins throw `Invalid URL` on every request.
    baseURL:
      configuredAppUrl() ??
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : undefined),
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    session: {
      cookieCache: { enabled: true, maxAge: 60 },
    },
    emailAndPassword: {
      // TODO: decide whether email/password stays on and whether sign-up is
      // open (`disableSignUp`).
      // TODO: email verification (`emailVerification.sendVerificationEmail`),
      // email OTP and magic-link sign-in are available as Better Auth options
      // — not enabled; owner decision.
      enabled: true,
      // TODO: reset-link lifetime — Better Auth's default is 1 hour.
      resetPasswordTokenExpiresIn: RESET_PASSWORD_EXPIRES_IN_SECONDS,
      sendResetPassword: async ({ user, url }) => {
        const mail = await renderPasswordResetEmail({
          resetUrl: url,
          expiresInMinutes: RESET_PASSWORD_EXPIRES_IN_SECONDS / 60,
        })
        await sendEmail({ to: user.email, ...mail })
      },
    },
    socialProviders: {
      ...(google
        ? {
            google: {
              clientId: google.clientId,
              clientSecret: google.clientSecret,
              // TODO: decide whether Google may create new accounts
              // (`disableSignUp: true` restricts it to existing users).
              prompt: 'select_account' as const,
            },
          }
        : {}),
    },
    account: {
      encryptOAuthTokens: true,
      // TODO: decide on account linking (e.g. Google ↔ email/password with
      // the same address) — `accountLinking: { enabled, trustedProviders }`.
    },
    plugins: [
      passkey(),
      lastLoginMethod(),
      // `jwt()` signs the access tokens `mcp()` issues.
      jwt(),
      // OAuth 2.1 authorization server for MCP clients. Left out (rather than
      // allowed to throw) when the resource URL is unusable — see
      // `isUsableResource`.
      ...(isUsableResource(wfResource) && isUsableResource(appResource)
        ? [
            mcp({
              resource: wfResource,
              resources: [appResource],
              scopes: [...OAUTH_SCOPES],
              loginPage: '/login',
              consentPage: '/oauth/consent',
              allowDynamicClientRegistration: true,
              allowUnauthenticatedClientRegistration: true,
              clientRegistrationDefaultScopes: [...OAUTH_SCOPES],
              clientRegistrationDefaultResources: [appResource],
            }),
          ]
        : []),
    ],
  })
}
