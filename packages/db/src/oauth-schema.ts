import {
  integer,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { session, user } from './auth-schema'

// ── OAuth 2.1 authorization server ───────────────────────────────────────────
//
// Better Auth owns every row in here (`@better-auth/oauth-provider`, pulled in
// by the `mcp()` plugin). It is declared rather than generated because the
// Drizzle adapter talks to these tables by PROPERTY name, not column name — so
// the property names below are a contract with the plugin and the snake_case
// columns are ours. They were emitted by the adapter's own schema generator
// against 1.7.6 and then reformatted, which is the only way to be sure a field
// wasn't missed.
//
// Why we are an authorization server at all: MCP clients (the app's own MCP
// at /api/mcp and 007's at /api/wf/mcp) authorize as a real user over OAuth,
// so every tool call carries that user's identity.
//
// `timestamp_ms` is the plugin's own choice for these tables (the hand-written
// Better Auth core tables next door use second precision). Read and write both
// go through Drizzle, so each table only has to agree with itself.

/**
 * The signing keys for issued access tokens (`jwt()` plugin).
 *
 * Generated on first use and read back on every token verification, so this is
 * the one table whose loss invalidates every live MCP session — clients
 * re-authorize, which is a browser round-trip, not a support ticket.
 */
export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  alg: text('alg'),
  crv: text('crv'),
})

/**
 * A registered OAuth client.
 *
 * Rows arrive by dynamic client registration (RFC 7591): an MCP client that has
 * never seen this deployment registers itself, unauthenticated, and gets a
 * `client_id` back. That is the standard MCP posture and it grants nothing on
 * its own — a client still has to send a human through login and consent before
 * any token exists.
 */
export const oauthClient = sqliteTable(
  'oauth_client',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().unique(),
    clientSecret: text('client_secret'),
    clientDiscoveryId: text('client_discovery_id'),
    disabled: integer('disabled', { mode: 'boolean' }).default(false),
    skipConsent: integer('skip_consent', { mode: 'boolean' }),
    enableEndSession: integer('enable_end_session', { mode: 'boolean' }),
    subjectType: text('subject_type'),
    scopes: text('scopes', { mode: 'json' }),
    clientCredentialsScopes: text('client_credentials_scopes', {
      mode: 'json',
    }).default([]),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    name: text('name'),
    uri: text('uri'),
    icon: text('icon'),
    contacts: text('contacts', { mode: 'json' }),
    tos: text('tos'),
    policy: text('policy'),
    softwareId: text('software_id'),
    softwareVersion: text('software_version'),
    softwareStatement: text('software_statement'),
    redirectUris: text('redirect_uris', { mode: 'json' }).notNull(),
    postLogoutRedirectUris: text('post_logout_redirect_uris', { mode: 'json' }),
    backchannelLogoutUri: text('backchannel_logout_uri'),
    backchannelLogoutSessionRequired: integer(
      'backchannel_logout_session_required',
      { mode: 'boolean' },
    ),
    tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
    applicationType: text('application_type'),
    jwks: text('jwks'),
    jwksUri: text('jwks_uri'),
    grantTypes: text('grant_types', { mode: 'json' }),
    responseTypes: text('response_types', { mode: 'json' }),
    requirePKCE: integer('require_pkce', { mode: 'boolean' }),
    dpopBoundAccessTokens: integer('dpop_bound_access_tokens', {
      mode: 'boolean',
    }).default(false),
    referenceId: text('reference_id'),
    metadata: text('metadata', { mode: 'json' }),
  },
  (t) => [index('oauth_client_user_idx').on(t.userId)],
)

/**
 * A protected resource tokens can be audience-bound to (RFC 8707).
 *
 * Seeded from the `resource` the `mcp()` plugin is configured with, so in
 * practice there is exactly one row: the MCP endpoint. Its presence is what
 * stops a token minted for this app being replayed against some other resource.
 */
export const oauthResource = sqliteTable('oauth_resource', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull().unique(),
  name: text('name').notNull(),
  accessTokenTtl: integer('access_token_ttl'),
  refreshTokenTtl: integer('refresh_token_ttl'),
  signingAlgorithm: text('signing_algorithm'),
  signingKeyId: text('signing_key_id'),
  allowedScopes: text('allowed_scopes', { mode: 'json' }),
  customClaims: text('custom_claims', { mode: 'json' }),
  dpopBoundAccessTokensRequired: integer('dpop_bound_access_tokens_required', {
    mode: 'boolean',
  }).default(false),
  disabled: integer('disabled', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  policyVersion: integer('policy_version').default(1),
  metadata: text('metadata', { mode: 'json' }),
})

/** Which resources a given client may request tokens for. */
export const oauthClientResource = sqliteTable(
  'oauth_client_resource',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    resourceId: text('resource_id')
      .notNull()
      .references(() => oauthResource.identifier, { onDelete: 'cascade' }),
    metadata: text('metadata', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    uniqueIndex('oauth_client_resource_uidx').on(t.clientId, t.resourceId),
    index('oauth_client_resource_client_idx').on(t.clientId),
    index('oauth_client_resource_resource_idx').on(t.resourceId),
  ],
)

/**
 * A refresh token, which is what makes the browser round-trip a one-time cost.
 *
 * `rotation_replay_response` backs the 30-second reuse window the `mcp()` plugin
 * turns on: a retried refresh recovers the response the first attempt produced
 * instead of tripping replay detection and logging the client out.
 */
export const oauthRefreshToken = sqliteTable(
  'oauth_refresh_token',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    sessionId: text('session_id').references(() => session.id, {
      onDelete: 'set null',
    }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('reference_id'),
    authorizationCodeId: text('authorization_code_id'),
    resources: text('resources', { mode: 'json' }),
    requestedUserInfoClaims: text('requested_user_info_claims', {
      mode: 'json',
    }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    revoked: integer('revoked', { mode: 'timestamp_ms' }),
    rotatedAt: integer('rotated_at', { mode: 'timestamp_ms' }),
    rotationReplayResponse: text('rotation_replay_response'),
    rotationReplayExpiresAt: integer('rotation_replay_expires_at', {
      mode: 'timestamp_ms',
    }),
    authTime: integer('auth_time', { mode: 'timestamp_ms' }),
    confirmation: text('confirmation', { mode: 'json' }),
    scopes: text('scopes', { mode: 'json' }).notNull(),
  },
  (t) => [
    index('oauth_refresh_token_client_idx').on(t.clientId),
    index('oauth_refresh_token_session_idx').on(t.sessionId),
    index('oauth_refresh_token_user_idx').on(t.userId),
    index('oauth_refresh_token_code_idx').on(t.authorizationCodeId),
  ],
)

/**
 * A live access token.
 *
 * `scopes` is the row that decides what an MCP session can do: `wf:read` alone
 * gets the read tools, and the write tools are only REGISTERED when `wf:write`
 * is present (see the MCP route). The gate is here rather than in a client-side
 * flag precisely because a client can set its own flags.
 */
export const oauthAccessToken = sqliteTable(
  'oauth_access_token',
  {
    id: text('id').primaryKey(),
    token: text('token').unique(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    sessionId: text('session_id').references(() => session.id, {
      onDelete: 'set null',
    }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('reference_id'),
    authorizationCodeId: text('authorization_code_id'),
    resources: text('resources', { mode: 'json' }),
    requestedUserInfoClaims: text('requested_user_info_claims', {
      mode: 'json',
    }),
    refreshId: text('refresh_id').references(() => oauthRefreshToken.id, {
      onDelete: 'cascade',
    }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    revoked: integer('revoked', { mode: 'timestamp_ms' }),
    confirmation: text('confirmation', { mode: 'json' }),
    scopes: text('scopes', { mode: 'json' }).notNull(),
  },
  (t) => [
    index('oauth_access_token_client_idx').on(t.clientId),
    index('oauth_access_token_session_idx').on(t.sessionId),
    index('oauth_access_token_user_idx').on(t.userId),
    index('oauth_access_token_code_idx').on(t.authorizationCodeId),
    index('oauth_access_token_refresh_idx').on(t.refreshId),
  ],
)

/**
 * What a person has already agreed to give a client.
 *
 * Remembered per (user, client, scopes), so consent is asked once and a later
 * step up to `wf:write` prompts again rather than riding in on the read grant.
 */
export const oauthConsent = sqliteTable(
  'oauth_consent',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('reference_id'),
    resources: text('resources', { mode: 'json' }),
    requestedUserInfoClaims: text('requested_user_info_claims', {
      mode: 'json',
    }),
    scopes: text('scopes', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('oauth_consent_client_idx').on(t.clientId),
    index('oauth_consent_user_idx').on(t.userId),
  ],
)

/**
 * Spent `private_key_jwt` client assertions, keyed by their `jti`.
 *
 * Replay prevention only — the row exists so the same assertion cannot be used
 * twice, and `expires_at` is what lets them be swept.
 */
export const oauthClientAssertion = sqliteTable('oauth_client_assertion', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
})
