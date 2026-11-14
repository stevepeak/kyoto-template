import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { PricingTiers } from '@/components/billing/pricing-tiers'
import { getAuth } from '@/lib/auth'
import { isBillingEnabled } from '@/lib/billing/stripe'
import { activeSubscription } from '@/lib/billing/subscription'
import { getDb } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple plans that grow with you.',
}

// Reads the session and the Stripe config per request.
export const dynamic = 'force-dynamic'

// TODO: pricing copy, and an FAQ below the cards if you need one.
export default async function PricingPage() {
  const db = getDb()
  const session = await getAuth(db).api.getSession({
    headers: await headers(),
  })
  const subscription = session
    ? await activeSubscription({ db, userId: session.user.id })
    : null

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <header className="mx-auto mb-14 max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          Pricing
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Simple plans that grow with you
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start small and upgrade when you need more. Change or cancel any time.
        </p>
      </header>

      <PricingTiers
        signedIn={Boolean(session)}
        billingEnabled={isBillingEnabled()}
        currentPlanId={subscription?.planInfo.id ?? null}
      />

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Prices in USD, billed monthly. Taxes may apply.
      </p>
    </main>
  )
}
