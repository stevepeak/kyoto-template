'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'
import type { PlanId } from '@/lib/billing/plans'

interface PlanCtaProps {
  planId: PlanId
  planName: string
  /** The popular plan gets the filled button. */
  emphasis: boolean
  signedIn: boolean
  billingEnabled: boolean
  /** The plan the user is subscribed to, if any. */
  currentPlanId: PlanId | null
}

const base =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'
const filled = `${base} bg-primary text-primary-foreground hover:bg-primary-hover`
const outline = `${base} border border-border bg-background text-foreground hover:bg-muted`

/**
 * Sends the user to Stripe Checkout for a new subscription, or — when they
 * already have one — to the billing portal to confirm the switch. The plugin
 * picks which, from the user's current subscription.
 */
export function PlanCta({
  planId,
  planName,
  emphasis,
  signedIn,
  billingEnabled,
  currentPlanId,
}: PlanCtaProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const className = emphasis ? filled : outline

  if (!signedIn) {
    return (
      <Link href="/login?redirectTo=/pricing" className={className}>
        Get started
      </Link>
    )
  }
  if (currentPlanId === planId) {
    return (
      <button type="button" disabled className={outline}>
        Current plan
      </button>
    )
  }
  if (!billingEnabled) {
    return (
      <button
        type="button"
        disabled
        className={className}
        title="Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable checkout"
      >
        Billing not configured
      </button>
    )
  }

  async function subscribe(): Promise<void> {
    setPending(true)
    setError(null)
    const { error: upgradeError } = await authClient.subscription.upgrade({
      plan: planId,
      successUrl: '/settings/billing?checkout=success',
      cancelUrl: '/pricing',
      returnUrl: '/settings/billing',
    })
    // On success the browser is already on its way to Stripe.
    if (upgradeError) {
      setError(upgradeError.message ?? 'Could not start checkout.')
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={subscribe}
        disabled={pending}
        className={className}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {currentPlanId ? `Switch to ${planName}` : `Choose ${planName}`}
      </button>
      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
