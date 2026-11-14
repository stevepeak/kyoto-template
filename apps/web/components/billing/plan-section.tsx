import { CreditCard, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { SectionCard } from '@/components/settings/section-card'
import { secondaryButtonClass } from '@/components/settings/styles'
import { EmptyState } from '@/components/states'
import { formatDate, formatMoney } from '@/lib/billing/format'
import type { ActiveSubscription } from '@/lib/billing/subscription'

import { ManageBillingButton } from './manage-billing-button'

interface PlanSectionProps {
  subscription: ActiveSubscription | null
  /** Has a Stripe customer — the portal works even with no live plan. */
  hasCustomer: boolean
}

/** One line on where the subscription stands, e.g. "Renews on Dec 14, 2026". */
function renewalLine(subscription: ActiveSubscription): string | null {
  const { status, periodEnd, cancelAtPeriodEnd, cancelAt, trialEnd } =
    subscription
  if (status === 'past_due') {
    return 'Your last payment failed — update your payment method to keep your plan.'
  }
  if (cancelAtPeriodEnd || cancelAt) {
    const end = cancelAt ?? periodEnd
    return end ? `Cancels on ${formatDate(end)}` : 'Cancels at period end'
  }
  if (status === 'trialing' && trialEnd) {
    return `Trial ends on ${formatDate(trialEnd)}`
  }
  return periodEnd ? `Renews on ${formatDate(periodEnd)}` : null
}

export function PlanSection({ subscription, hasCustomer }: PlanSectionProps) {
  if (!subscription) {
    return (
      <SectionCard
        title="Plan"
        description="Your subscription and payment method."
        icon={CreditCard}
      >
        <EmptyState
          icon={Sparkles}
          title="You're not on a plan yet"
          description="Pick the plan that fits — you can change or cancel any time."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/pricing" className={secondaryButtonClass}>
                See plans
              </Link>
              {hasCustomer ? <ManageBillingButton /> : null}
            </div>
          }
        />
      </SectionCard>
    )
  }

  const { planInfo, status } = subscription
  const line = renewalLine(subscription)

  return (
    <SectionCard
      title="Plan"
      description="Your subscription and payment method."
      icon={CreditCard}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-gray-900">
              {planInfo.name}
            </p>
            {status === 'trialing' ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Trial
              </span>
            ) : null}
            {status === 'past_due' ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                Past due
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-gray-600">
            {formatMoney({ cents: planInfo.priceCents })} per month
          </p>
          {line ? <p className="mt-2 text-sm text-gray-500">{line}</p> : null}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/pricing" className={secondaryButtonClass}>
            Change plan
          </Link>
          <ManageBillingButton />
        </div>
      </div>
    </SectionCard>
  )
}
