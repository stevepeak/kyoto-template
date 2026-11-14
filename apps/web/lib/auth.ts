import { type DB, schema } from '@app/db'
import { mcp } from '@better-auth/mcp'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { jwt, lastLoginMethod } from 'better-auth/plugins'

import { cfVar } from './cf-env'
import { getDb } from './db'
import {
  APP_MCP_PATH,
  configuredAppUrl,
  isUsableResource,
  OAUTH_SCOPES,
  resourceUrl,
  WF_MCP_PATH,
} from './mcp-resources'

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
    baseURL: configuredAppUrl(),
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    session: {
      cookieCache: { enabled: true, maxAge: 60 },
    },
    emailAndPassword: {
      // TODO: decide whether email/password stays on, whether sign-up is open
      // (`disableSignUp`), and wire `sendResetPassword` via @app/email.
      enabled: true,
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
