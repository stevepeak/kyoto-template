import Stripe from 'stripe'

import { CURRENCY, PLANS } from '../lib/billing/plans'

// Creates the Stripe product + monthly price for every plan in
// lib/billing/plans.ts, so the pricing page and Stripe agree.
//
// Idempotent. A plan whose price is already right is left alone (its product's
// name and description are refreshed). When `priceCents` changes, a NEW price
// takes over the lookup key (`transfer_lookup_key`) and the old one is
// archived — existing subscribers stay on the old price until they change plan.
//
// Run from apps/web: `bun run stripe:sync` (reads STRIPE_SECRET_KEY from the
// root .env). Live keys need `--live`, so a test run can't touch real data.

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set (root .env).')
  process.exit(1)
}
if (secretKey.startsWith('sk_live_') && !process.argv.includes('--live')) {
  console.error('That is a LIVE key. Re-run with --live to sync live mode.')
  process.exit(1)
}

const stripe = new Stripe(secretKey)

async function findProduct(planId: string): Promise<Stripe.Product | null> {
  for await (const product of stripe.products.list({ limit: 100 })) {
    if (product.metadata.plan_id === planId) return product
  }
  return null
}

for (const plan of PLANS) {
  const existing = (
    await stripe.prices.list({
      lookup_keys: [plan.lookupKey],
      expand: ['data.product'],
    })
  ).data[0]

  const upToDate =
    existing?.unit_amount === plan.priceCents &&
    existing.currency === CURRENCY &&
    existing.recurring?.interval === 'month'

  const product =
    (existing &&
    typeof existing.product === 'object' &&
    !existing.product.deleted
      ? existing.product
      : null) ?? (await findProduct(plan.id))

  const productFields = {
    name: plan.name,
    description: plan.tagline,
    metadata: { plan_id: plan.id },
  }
  const productId = product
    ? (await stripe.products.update(product.id, productFields)).id
    : (await stripe.products.create(productFields)).id

  if (upToDate) {
    console.log(`✓ ${plan.id}: ${plan.lookupKey} already up to date`)
    continue
  }

  await stripe.prices.create({
    product: productId,
    currency: CURRENCY,
    unit_amount: plan.priceCents,
    recurring: { interval: 'month' },
    lookup_key: plan.lookupKey,
    transfer_lookup_key: true,
    metadata: { plan_id: plan.id },
  })
  if (existing) {
    await stripe.prices.update(existing.id, { active: false })
    console.log(
      `↻ ${plan.id}: new price for ${plan.lookupKey}, archived ${existing.id}`,
    )
  } else {
    console.log(`+ ${plan.id}: created ${plan.lookupKey}`)
  }
}
