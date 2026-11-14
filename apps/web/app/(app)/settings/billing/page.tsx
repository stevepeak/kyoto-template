import { CircleCheck, CreditCard } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { InvoicesSection } from '@/components/billing/invoices-section'
import { PlanSection } from '@/components/billing/plan-section'
import { SectionCard } from '@/components/settings/section-card'
import { EmptyState } from '@/components/states'
import { getAuth } from '@/lib/auth'
import { listInvoices } from '@/lib/billing/invoices'
import { isBillingEnabled } from '@/lib/billing/stripe'
import {
  activeSubscription,
  stripeCustomerId,
} from '@/lib/billing/subscription'
import { getDb } from '@/lib/db'

export const metadata: Metadata = { title: 'Billing' }

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const db = getDb()
  const session = await getAuth(db).api.getSession({
    headers: await headers(),
  })
  if (!session) redirect('/login?redirectTo=/settings/billing')

  if (!isBillingEnabled()) {
    return (
      <SectionCard title="Billing" icon={CreditCard}>
        <EmptyState
          icon={CreditCard}
          title="Billing isn't set up"
          description="Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to turn on plans and invoices — see /setup."
        />
      </SectionCard>
    )
  }

  const userId = session.user.id
  const [subscription, customerId, { checkout }] = await Promise.all([
    activeSubscription({ db, userId }),
    stripeCustomerId({ db, userId }),
    searchParams,
  ])
  const invoices = customerId ? await listInvoices({ customerId }) : []

  return (
    <>
      {checkout === 'success' ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"
        >
          <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          Thanks — your subscription is active. A receipt is on its way to your
          inbox.
        </div>
      ) : null}
      <PlanSection
        subscription={subscription}
        hasCustomer={Boolean(customerId)}
      />
      <InvoicesSection invoices={invoices} />
    </>
  )
}
