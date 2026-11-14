import { and, type DB, eq, isNull, ne, or, schema } from '@app/db'
import {
  renderPasskeyAddedEmail,
  renderPasswordResetEmail,
  renderVerifyEmail,
} from '@app/email'
import { apiKey } from '@better-auth/api-key'
import { mcp } from '@better-auth/mcp'
import { passkey } from '@better-auth/passkey'
import { stripe } from '@better-auth/stripe'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api'
import { admin, captcha, jwt, lastLoginMethod } from 'better-auth/plugins'

import { recordAuditEvent, requestOrigin } from './audit'
import { PLANS } from './billing/plans'
import { getStripe, stripeConfig } from './billing/stripe'
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
import { canUseWorkflows } from './wf-access'

/**
 * Lifetime of a password-reset link. Passed to Better Auth AND rendered into
 * the email, so the number a reader is told is the number the server enforces.
 */
const RESET_PASSWORD_EXPIRES_IN_SECONDS = 60 * 60

/** Lifetime of an email-verification link — same deal as the reset link. */
const VERIFY_EMAIL_EXPIRES_IN_SECONDS = 60 * 60

/**
 * Tells the account owner a passkey was registered, and logs it. Runs as an
 * `after` hook rather than the plugin's `registration.afterVerification`,
 * which fires BEFORE the passkey row is written — mailing from there would
 * announce a passkey that a failed insert never created.
 *
 * Never throws: the passkey is already saved, and a mail failure must not turn
 * a successful registration into an error the user sees.
 */
async function onPasskeyAdded(args: {
  db: DB
  user: { id: string; email: string }
  passkey: { name?: string; createdAt?: Date }
  baseURL: string
  request: Request | undefined
}): Promise<void> {
  const { name, createdAt } = args.passkey
  await recordAuditEvent({
    db: args.db,
    userId: args.user.id,
    type: 'passkey_added',
    ...requestOrigin(args.request),
    detail: { name: name ?? null },
  })
  try {
    const mail = await renderPasskeyAddedEmail({
      passkeyName: name ?? null,
      addedAt: createdAt ? new Date(createdAt) : new Date(),
      settingsUrl: `${new URL(args.baseURL).origin}/settings/security`,
    })
    await sendEmail({ to: args.user.email, ...mail })
  } catch (error) {
    console.error('[email] passkey-added notice failed', error)
  }
}

/**
 * After a successful auth endpoint: security notices and the account audit
 * trail. `returned` is the endpoint's response body — or an APIError, which
 * none of these shapes match.
 */
function afterAuthHook(db: DB) {
  return createAuthMiddleware(async (ctx) => {
    const returned: unknown = ctx.context.returned
    const user = ctx.context.session?.user
    if (!returned || typeof returned !== 'object') return
    const origin = requestOrigin(ctx.request)

    switch (ctx.path) {
      case '/passkey/verify-registration': {
        if (!user || !('credentialID' in returned)) return
        await onPasskeyAdded({
          db,
          user,
          passkey: returned as { name?: string; createdAt?: Date },
          baseURL: ctx.context.baseURL,
          request: ctx.request,
        })
        return
      }
      case '/change-password': {
        // The response names the user: with `revokeOtherSessions` the
        // session in context is the one that was just replaced.
        if (!('user' in returned)) return
        const { id } = returned.user as { id: string }
        await recordAuditEvent({
          db,
          userId: id,
          type: 'password_changed',
          ...origin,
        })
        return
      }
      case '/api-key/create': {
        if (!user || !('key' in returned)) return
        const { name } = returned as { name?: string | null }
        await recordAuditEvent({
          db,
          userId: user.id,
          type: 'api_key_created',
          ...origin,
          detail: { name: name ?? null },
        })
        return
      }
      case '/api-key/delete': {
        if (!user || !('success' in returned) || !returned.success) return
        await recordAuditEvent({
          db,
          userId: user.id,
          type: 'api_key_deleted',
          ...origin,
        })
        return
      }
    }
  })
}

/**
 * The admin panel uses the same allowlist as /setup and the 007 console
 * (`canUseWorkflows`), not a role someone could set by hand. The admin plugin
 * checks `user.role`, so an allowlisted caller's role is promoted here before
 * the endpoint runs (its own session read skips the cookie cache, so it sees
 * the write). Dropping someone from the allowlist cuts them off on their next
 * request, whatever their stored role says.
 *
 * `stop-impersonating` is exempt: during impersonation the session belongs to
 * the impersonated user, who isn't on the allowlist.
 */
function requireAllowlistedAdmin(db: DB) {
  return createAuthMiddleware(async (ctx) => {
    if (!ctx.path.startsWith('/admin/')) return
    if (ctx.path === '/admin/stop-impersonating') return
    const session = await getSessionFromCtx(ctx)
    if (!session || !canUseWorkflows(session.user.email)) {
      throw new APIError('FORBIDDEN', { message: 'Admins only' })
    }
    await db
      .update(schema.user)
      .set({ role: 'admin' })
      .where(
        and(
          eq(schema.user.id, session.user.id),
          or(isNull(schema.user.role), ne(schema.user.role, 'admin')),
        ),
      )
  })
}

/** How a session was created, by the endpoint that created it. */
function signInMethod(ctx: {
  path?: string
  params?: Record<string, string | undefined>
}): string | null {
  if (ctx.path === '/sign-in/email') return 'password'
  if (ctx.path === '/passkey/verify-authentication') return 'passkey'
  if (ctx.path === '/verify-email') return 'email link'
  if (ctx.path?.startsWith('/callback/')) return ctx.params?.id ?? null
  return null
}

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
  const billing = stripeConfig()
  const stripeClient = getStripe()
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
      onPasswordReset: async ({ user }, request) => {
        await recordAuditEvent({
          db,
          userId: user.id,
          type: 'password_reset',
          ...requestOrigin(request),
        })
      },
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
    hooks: {
      before: requireAllowlistedAdmin(db),
      after: afterAuthHook(db),
    },
    databaseHooks: {
      session: {
        create: {
          // Every new session is a sign-in, whatever the method — except the
          // replacement `/change-password` mints, already logged as such.
          after: async (session, ctx) => {
            if (ctx?.path === '/change-password') return
            const impersonatedBy =
              'impersonatedBy' in session &&
              typeof session.impersonatedBy === 'string'
                ? session.impersonatedBy
                : null
            await recordAuditEvent({
              db,
              userId: session.userId,
              type: impersonatedBy ? 'impersonated' : 'sign_in',
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              detail: impersonatedBy
                ? { impersonatedBy }
                : { method: ctx ? signInMethod(ctx) : null },
            })
          },
        },
      },
    },
    account: {
      encryptOAuthTokens: true,
      // TODO: decide on account linking (e.g. Google ↔ email/password with
      // the same address) — `accountLinking: { enabled, trustedProviders }`.
    },
    plugins: [
      passkey(),
      // Ban and impersonate, for allowlisted admins only — see
      // `requireAllowlistedAdmin`. Banning revokes the user's sessions and
      // blocks new sign-ins.
      admin(),
      // Personal API keys. Only the hash is stored; tRPC accepts a key in the
      // `x-api-key` header (see `readSessionUser`).
      apiKey({
        // The plugin's default limit is 10 requests a day per key.
        // TODO: pick a per-key budget, or rely on the D1 limiter above.
        rateLimit: { enabled: false },
      }),
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
      // Stripe subscriptions: checkout (`/subscription/upgrade`), the billing
      // portal, cancel/restore, and the webhook at /api/auth/stripe/webhook
      // that keeps the `subscription` table in sync. Off without both keys.
      // The Stripe customer is created at first checkout, not at sign-up.
      ...(billing && stripeClient
        ? [
            stripe({
              stripeClient,
              stripeWebhookSecret: billing.webhookSecret,
              createCustomerOnSignUp: false,
              subscription: {
                enabled: true,
                requireEmailVerification: true,
                plans: PLANS.map((plan) => ({
                  name: plan.id,
                  lookupKey: plan.lookupKey,
                })),
                getCheckoutSessionParams: () => ({
                  params: {
                    allow_promotion_codes: true,
                    // TODO: Stripe Tax (`automatic_tax: { enabled: true }`)
                    // and `billing_address_collection: 'required'` if you
                    // charge tax; free trials via `subscription_data`.
                  },
                }),
              },
            }),
          ]
        : []),
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
