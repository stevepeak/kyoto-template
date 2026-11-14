import Stripe from 'stripe'

import { cfVar } from '../cf-env'

/** Billing is on only when both the API key and webhook secret are set. */
export function stripeConfig(): {
  secretKey: string
  webhookSecret: string
} | null {
  const secretKey = cfVar('STRIPE_SECRET_KEY')
  const webhookSecret = cfVar('STRIPE_WEBHOOK_SECRET')
  return secretKey && webhookSecret ? { secretKey, webhookSecret } : null
}

export function isBillingEnabled(): boolean {
  return stripeConfig() !== null
}

/**
 * A Stripe client over `fetch` — Workers have no Node `http`. Null when
 * billing is off.
 */
export function getStripe(): Stripe | null {
  const config = stripeConfig()
  if (!config) return null
  return new Stripe(config.secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}
