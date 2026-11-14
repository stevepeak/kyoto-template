import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Better Auth `stripe()` plugin: one row per Stripe subscription, written by
 * its webhook. `referenceId` is the owning user's id (an organization's, if
 * the organization plugin is ever added). Invoices aren't mirrored — the
 * billing page reads them from Stripe.
 */
export const subscription = sqliteTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    /** A plan id from `PLANS` in apps/web/lib/billing/plans.ts. */
    plan: text('plan').notNull(),
    referenceId: text('reference_id').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    /** Stripe's status: active, trialing, past_due, canceled, incomplete, … */
    status: text('status').notNull().default('incomplete'),
    periodStart: integer('period_start', { mode: 'timestamp' }),
    periodEnd: integer('period_end', { mode: 'timestamp' }),
    trialStart: integer('trial_start', { mode: 'timestamp' }),
    trialEnd: integer('trial_end', { mode: 'timestamp' }),
    cancelAtPeriodEnd: integer('cancel_at_period_end', {
      mode: 'boolean',
    }).default(false),
    cancelAt: integer('cancel_at', { mode: 'timestamp' }),
    canceledAt: integer('canceled_at', { mode: 'timestamp' }),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    seats: integer('seats'),
    billingInterval: text('billing_interval'),
    stripeScheduleId: text('stripe_schedule_id'),
  },
  (t) => [
    index('subscription_reference_id_idx').on(t.referenceId),
    index('subscription_stripe_subscription_id_idx').on(t.stripeSubscriptionId),
  ],
)
