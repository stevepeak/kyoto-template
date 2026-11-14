import { Check } from 'lucide-react'

import { formatMoney } from '@/lib/billing/format'
import { type PlanId, PLANS } from '@/lib/billing/plans'

import { PlanCta } from './plan-cta'

interface PricingTiersProps {
  signedIn: boolean
  billingEnabled: boolean
  currentPlanId: PlanId | null
}

/** The three plan cards, the popular one lifted and tagged. */
export function PricingTiers({
  signedIn,
  billingEnabled,
  currentPlanId,
}: PricingTiersProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3 md:items-center md:gap-0">
      {PLANS.map((plan) => {
        const popular = plan.popular === true
        return (
          <article
            key={plan.id}
            aria-label={`${plan.name} plan`}
            className={
              popular
                ? 'relative z-10 flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-xl md:py-12'
                : 'flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm md:first:rounded-r-none md:first:border-r-0 md:last:rounded-l-none md:last:border-l-0'
            }
          >
            {popular ? (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground uppercase shadow-sm">
                Most popular
              </span>
            ) : null}

            <h2 className="text-lg font-semibold text-foreground">
              {plan.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight text-foreground">
                {formatMoney({ cents: plan.priceCents })}
              </span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </p>

            <div className="mt-6">
              <PlanCta
                planId={plan.id}
                planName={plan.name}
                emphasis={popular}
                signedIn={signedIn}
                billingEnabled={billingEnabled}
                currentPlanId={currentPlanId}
              />
            </div>

            <ul className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${popular ? 'text-primary' : 'text-muted-foreground'}`}
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}
