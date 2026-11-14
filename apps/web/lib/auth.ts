import { type DB, schema } from '@app/db'
import {
  renderPasskeyAddedEmail,
  renderPasswordResetEmail,
  renderVerifyEmail,
} from '@app/email'
import { mcp } from '@better-auth/mcp'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { captcha, jwt, lastLoginMethod } from 'better-auth/plugins'

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

/** Lifetime of an email-verification link — same deal as the reset link. */
const VERIFY_EMAIL_EXPIRES_IN_SECONDS = 60 * 60

/**
 * Tells the account owner a passkey was registered. Runs as an `after` hook
 * rather than the plugin's `registration.afterVerification`, which fires
 * BEFORE the passkey row is written — mailing from there would announce a
 * passkey that a failed insert never created.
 *
 * Never throws: the passkey is already saved, and a mail failure must not turn
 * a successful registration into an error the user sees.
 */
const notifyPasskeyAdded = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== '/passkey/verify-registration') return
  const passkey = ctx.context.returned
  const user = ctx.context.session?.user
  if (
    !user ||
    !passkey ||
    typeof passkey !== 'object' ||
    !('credentialID' in passkey)
  ) {
    return
  }
  const { name, createdAt } = passkey as { name?: string; createdAt?: Date }
  try {
    const mail = await renderPasskeyAddedEmail({
      passkeyName: name ?? null,
      addedAt: createdAt ? new Date(createdAt) : new Date(),
      settingsUrl: `${new URL(ctx.context.baseURL).origin}/settings/security`,
    })
    await sendEmail({ to: user.email, ...mail })
  } catch (error) {
    console.error('[email] passkey-added notice failed', error)
  }
})

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

/** Turnstile is enabled only when both the site key and secret are set. */
function turnstileConfig() {
  const siteKey = cfVar('TURNSTILE_SITE_KEY')
  const secretKey = cfVar('TURNSTILE_SECRET_KEY')
  return siteKey && secretKey ? { siteKey, secretKey } : null
}

/**
 * The public site key for the auth forms' Turnstile widget, or null when
 * Turnstile is off. Null must mean the server isn't checking either —
 * otherwise every sign-in would fail with a missing captcha response.
 */
export function turnstileSiteKey(): string | null {
  return turnstileConfig()?.siteKey ?? null
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
  const turnstile = turnstileConfig()
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
    // Counters live in D1 (`rate_limit`): the default in-memory store is per
    // isolate, which on Workers means barely limited at all. Better Auth
    // already applies tighter built-in rules to sign-in/sign-up (3 per 10s)
    // and reset/verification mail (3 per 60s) on top of this default.
    // Off in development unless `enabled` is forced.
    rateLimit: {
      storage: 'database',
      modelName: 'rateLimit',
      // TODO: tune the default budget for everything else under /api/auth.
      window: 60,
      max: 100,
      customRules: {
        // Polled by every client on focus; each check would be a D1 write.
        '/get-session': false,
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const mail = await renderVerifyEmail({
          verifyUrl: url,
          expiresInMinutes: VERIFY_EMAIL_EXPIRES_IN_SECONDS / 60,
        })
        await sendEmail({ to: user.email, ...mail })
      },
      expiresIn: VERIFY_EMAIL_EXPIRES_IN_SECONDS,
      sendOnSignUp: true,
      // An unverified account that tries to sign in gets a fresh link, so a
      // lost or expired first email isn't a dead end.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    emailAndPassword: {
      // TODO: decide whether email/password stays on and whether sign-up is
      // open (`disableSignUp`).
      // TODO: email OTP and magic-link sign-in are available as Better Auth
      // plugins — not enabled; owner decision.
      enabled: true,
      // Without this anyone can sign up as an address they don't own.
      requireEmailVerification: true,
      // TODO: reset-link lifetime — Better Auth's default is 1 hour.
      resetPasswordTokenExpiresIn: RESET_PASSWORD_EXPIRES_IN_SECONDS,
      // Whoever forced the reset may already be signed in elsewhere.
      revokeSessionsOnPasswordReset: true,
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
    hooks: { after: notifyPasskeyAdded },
    account: {
      encryptOAuthTokens: true,
      // TODO: decide on account linking (e.g. Google ↔ email/password with
      // the same address) — `accountLinking: { enabled, trustedProviders }`.
    },
    plugins: [
      passkey(),
      // Bot check on sign-up, email sign-in and password-reset requests (the
      // plugin's default endpoints). The client sends the widget's token in
      // `x-captcha-response`.
      ...(turnstile
        ? [
            captcha({
              provider: 'cloudflare-turnstile',
              secretKey: turnstile.secretKey,
            }),
          ]
        : []),
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
