/**
 * The plans on /pricing — and the source of truth for Stripe. Each plan's
 * `lookupKey` names a Stripe price; `bun run --cwd apps/web stripe:sync`
 * creates the product + price for every plan here (and moves the lookup key
 * to a new price when `priceCents` changes), so the page and Stripe can't
 * disagree on what a plan costs.
 *
 * Plan ids are stored on `subscription.plan`; don't rename one that has
 * subscribers.
 */

// TODO: plan names, prices, features and limits. Annual pricing: add an
// `annualLookupKey` per plan, pass it to the Stripe plugin as
// `annualDiscountLookupKey`, and add a monthly/yearly toggle to /pricing.

export const CURRENCY = 'usd'

export type PlanId = 'starter' | 'pro' | 'business'

export type Plan = {
  id: PlanId
  name: string
  /** One line under the name: who the plan is for. */
  tagline: string
  /** Per month, in the smallest currency unit. */
  priceCents: number
  lookupKey: string
  /** Shown as a checklist on the pricing card. */
  features: string[]
  /** Gets the "Most popular" tag and the emphasised card. */
  popular?: boolean
  /** Read with `planLimits` to gate features in the app. */
  limits: { projects: number; members: number }
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For individuals getting started.',
    priceCents: 900,
    lookupKey: 'starter_monthly',
    features: ['3 projects', '1 member', 'Community support'],
    limits: { projects: 3, members: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For professionals who ship every day.',
    priceCents: 2900,
    lookupKey: 'pro_monthly',
    features: [
      'Unlimited projects',
      'Up to 5 members',
      'Workflow automations',
      'Email support',
    ],
    popular: true,
    limits: { projects: Number.POSITIVE_INFINITY, members: 5 },
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For teams that need control and scale.',
    priceCents: 9900,
    lookupKey: 'business_monthly',
    features: [
      'Everything in Pro',
      'Unlimited members',
      'Audit log export',
      'Priority support',
    ],
    limits: {
      projects: Number.POSITIVE_INFINITY,
      members: Number.POSITIVE_INFINITY,
    },
  },
]

export function findPlan(id: string): Plan | null {
  return PLANS.find((plan) => plan.id === id) ?? null
}
