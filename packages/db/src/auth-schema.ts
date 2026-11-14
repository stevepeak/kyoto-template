import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  // Admin plugin. `role` is 'admin' only for allowlisted admins — synced by
  // the web app's auth hook, never set by hand.
  role: text('role'),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp' }),
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    // Admin plugin: the admin's user id when this session is an impersonation.
    impersonatedBy: text('impersonated_by'),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    // Sealed by Better Auth (`encryptOAuthTokens`); rows from before that was on
    // may still be plaintext until their next refresh. `idToken` is never sealed.
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    // Better Auth recognizes a linked identity by (provider_id, account_id);
    // without this the same Google identity can link twice.
    uniqueIndex('account_provider_account_uniq').on(t.providerId, t.accountId),
    index('account_user_id_idx').on(t.userId),
  ],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  // Every OTP and magic-link lookup filters on `identifier`.
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

export const passkey = sqliteTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
    transports: text('transports'),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    aaguid: text('aaguid'),
  },
  (t) => [index('passkey_user_id_idx').on(t.userId)],
)

/**
 * Better Auth's rate-limit counters (`rateLimit.storage: 'database'`). Lives in
 * D1 because the default in-memory store is per isolate — on Workers every
 * isolate would get its own budget, so the limit would barely apply.
 */
export const rateLimit = sqliteTable(
  'rate_limit',
  {
    id: text('id').primaryKey(),
    // "<ip>|<path>" — one row per client per rate-limited endpoint.
    key: text('key').notNull().unique(),
    count: integer('count').notNull(),
    // Epoch milliseconds, not a timestamp column: Better Auth compares it
    // numerically against `Date.now()`.
    lastRequest: integer('last_request').notNull(),
  },
  // Expired rows are pruned with `last_request < cutoff`.
  (t) => [index('rate_limit_last_request_idx').on(t.lastRequest)],
)

/**
 * Personal API keys (`@better-auth/api-key`). Only a hash of the key is stored;
 * `start` keeps the first few characters so a person can tell keys apart.
 * `referenceId` is the owning user's id.
 */
export const apikey = sqliteTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    configId: text('config_id').notNull().default('default'),
    name: text('name'),
    start: text('start'),
    referenceId: text('reference_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    prefix: text('prefix'),
    key: text('key').notNull(),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: integer('last_refill_at', { mode: 'timestamp' }),
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    rateLimitEnabled: integer('rate_limit_enabled', {
      mode: 'boolean',
    }).default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining'),
    lastRequest: integer('last_request', { mode: 'timestamp' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (t) => [
    // Every authenticated request looks its key up by hash.
    index('apikey_key_idx').on(t.key),
    index('apikey_reference_id_idx').on(t.referenceId),
    index('apikey_config_id_idx').on(t.configId),
  ],
)
