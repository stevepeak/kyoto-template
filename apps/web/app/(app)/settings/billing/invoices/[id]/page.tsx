import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { InvoiceDocument } from '@/components/billing/invoice-document'
import { getAuth } from '@/lib/auth'
import { getInvoice } from '@/lib/billing/invoices'
import { stripeCustomerId } from '@/lib/billing/subscription'
import { getDb } from '@/lib/db'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = getDb()
  const session = await getAuth(db).api.getSession({
    headers: await headers(),
  })
  if (!session) redirect(`/login?redirectTo=/settings/billing/invoices/${id}`)

  const customerId = await stripeCustomerId({ db, userId: session.user.id })
  // getInvoice checks the invoice belongs to this customer.
  const invoice = customerId
    ? await getInvoice({ customerId, invoiceId: id })
    : null
  if (!invoice) notFound()

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/settings/billing"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Billing
      </Link>
      <InvoiceDocument invoice={invoice} />
    </div>
  )
}
