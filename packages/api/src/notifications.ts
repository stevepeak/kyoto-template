import { and, type DB, eq, schema } from '@app/db'
import { z } from 'zod'

import { protectedProcedure, router } from './trpc'

/**
 * Optional email categories a user can turn off. Security and account mail
 * (verification, password reset, new-passkey notices) is NOT here — it is
 * always sent, and never carries an unsubscribe link.
 *
 * TODO: rename/extend for your product. Removing a category leaves its rows
 * orphaned but harmless.
 */
export const NOTIFICATION_CATEGORIES = {
  product_updates: {
    label: 'Product updates',
    description: 'New features and important changes.',
    defaultEnabled: true,
  },
  tips: {
    label: 'Tips & onboarding',
    description: 'Getting-started guides and occasional tips.',
    defaultEnabled: true,
  },
} as const

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES

export const notificationCategorySchema = z.enum(
  Object.keys(NOTIFICATION_CATEGORIES) as [
    NotificationCategory,
    ...NotificationCategory[],
  ],
)

/** Every category with this user's setting, defaults filled in. */
async function getNotificationPreferences(db: DB, userId: string) {
  const rows = await db
    .select({
      category: schema.notificationPreference.category,
      enabled: schema.notificationPreference.enabled,
    })
    .from(schema.notificationPreference)
    .where(eq(schema.notificationPreference.userId, userId))
  const saved = new Map(rows.map((r) => [r.category, r.enabled]))

  return (
    Object.entries(NOTIFICATION_CATEGORIES) as [
      NotificationCategory,
      (typeof NOTIFICATION_CATEGORIES)[NotificationCategory],
    ][]
  ).map(([category, meta]) => ({
    category,
    label: meta.label,
    description: meta.description,
    enabled: saved.get(category) ?? meta.defaultEnabled,
  }))
}

/** Whether to send this user mail in `category` — check before every send. */
export async function isNotificationEnabled(
  db: DB,
  userId: string,
  category: NotificationCategory,
): Promise<boolean> {
  const [row] = await db
    .select({ enabled: schema.notificationPreference.enabled })
    .from(schema.notificationPreference)
    .where(
      and(
        eq(schema.notificationPreference.userId, userId),
        eq(schema.notificationPreference.category, category),
      ),
    )
    .limit(1)
  return row?.enabled ?? NOTIFICATION_CATEGORIES[category].defaultEnabled
}

export async function setNotificationPreference(
  db: DB,
  userId: string,
  category: NotificationCategory,
  enabled: boolean,
): Promise<void> {
  const updatedAt = new Date()
  await db
    .insert(schema.notificationPreference)
    .values({ userId, category, enabled, updatedAt })
    .onConflictDoUpdate({
      target: [
        schema.notificationPreference.userId,
        schema.notificationPreference.category,
      ],
      set: { enabled, updatedAt },
    })
}

export const notificationsRouter = router({
  preferences: protectedProcedure.query(async ({ ctx }) => {
    return await getNotificationPreferences(ctx.db, ctx.user.id)
  }),
  setPreference: protectedProcedure
    .input(
      z.object({ category: notificationCategorySchema, enabled: z.boolean() }),
    )
    .mutation(async ({ ctx, input }) => {
      await setNotificationPreference(
        ctx.db,
        ctx.user.id,
        input.category,
        input.enabled,
      )
      return { ok: true }
    }),
})
