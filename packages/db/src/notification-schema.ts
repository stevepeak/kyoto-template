import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth-schema'

/**
 * A user's opt-in/out per email category (`NOTIFICATION_CATEGORIES` in
 * @app/api). No row means the category's default applies, so adding a
 * category needs no backfill. Security and account mail (verification,
 * resets, new-passkey notices) is never optional and has no row here.
 */
export const notificationPreference = sqliteTable(
  'notification_preference',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
)
