import { and, type DB, desc, eq, inArray, schema } from '@app/db'

import { findPlan, type Plan } from './plans'

/** Statuses that still grant the plan. `past_due` keeps access while Stripe retries. */
const ENTITLED_STATUSES = ['active', 'trialing', 'past_due']

export type ActiveSubscription = typeof schema.subscription.$inferSelect & {
  planInfo: Plan
}

/** The user's current paid subscription, or null when they're on no plan. */
export async function activeSubscription(args: {
  db: DB
  userId: string
}): Promise<ActiveSubscription | null> {
  const rows = await args.db
    .select()
    .from(schema.subscription)
    .where(
      and(
        eq(schema.subscription.referenceId, args.userId),
        inArray(schema.subscription.status, ENTITLED_STATUSES),
      ),
    )
    .orderBy(desc(schema.subscription.periodEnd))
    .limit(1)
  const row = rows[0]
  const planInfo = row ? findPlan(row.plan) : null
  return row && planInfo ? { ...row, planInfo } : null
}

/** The user's Stripe customer id — set at their first checkout. */
export async function stripeCustomerId(args: {
  db: DB
  userId: string
}): Promise<string | null> {
  const rows = await args.db
    .select({ id: schema.user.stripeCustomerId })
    .from(schema.user)
    .where(eq(schema.user.id, args.userId))
    .limit(1)
  return rows[0]?.id ?? null
}

/**
 * What the user's plan allows — for gating features. No plan gets the
 * zero limits.
 */
export async function planLimits(args: {
  db: DB
  userId: string
}): Promise<Plan['limits']> {
  const sub = await activeSubscription(args)
  // TODO: the free tier's limits (or block the app until a plan is chosen).
  return sub?.planInfo.limits ?? { projects: 0, members: 1 }
}
