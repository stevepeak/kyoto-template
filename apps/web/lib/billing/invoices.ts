import Stripe from 'stripe'

import { getStripe } from './stripe'

/**
 * Invoices are read from Stripe on each visit, not mirrored into D1: Stripe
 * is the record, and a copy would only drift. These are the plain shapes the
 * billing pages render.
 */

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'

export type InvoiceSummary = {
  id: string
  number: string | null
  status: InvoiceStatus
  createdAt: Date
  totalCents: number
  currency: string
  /** Stripe-hosted PDF, for download. */
  pdfUrl: string | null
  /** Stripe-hosted page where an open invoice can be paid. */
  payUrl: string | null
}

type InvoiceLine = {
  id: string
  description: string
  quantity: number | null
  amountCents: number
  periodStart: Date
  periodEnd: Date
}

export type InvoiceDetail = InvoiceSummary & {
  issuerName: string | null
  customerName: string | null
  customerEmail: string | null
  customerAddress: string[]
  periodStart: Date
  periodEnd: Date
  dueAt: Date | null
  paidAt: Date | null
  lines: InvoiceLine[]
  subtotalCents: number
  discountCents: number
  taxCents: number
  amountPaidCents: number
  amountDueCents: number
}

const KNOWN_STATUSES: InvoiceStatus[] = [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
]

function fromUnix(seconds: number): Date {
  return new Date(seconds * 1000)
}

function toSummary(invoice: Stripe.Invoice): InvoiceSummary {
  const status = KNOWN_STATUSES.find((s) => s === invoice.status) ?? 'draft'
  return {
    id: invoice.id ?? '',
    number: invoice.number,
    status,
    createdAt: fromUnix(invoice.created),
    totalCents: invoice.total,
    currency: invoice.currency,
    pdfUrl: invoice.invoice_pdf ?? null,
    payUrl: status === 'open' ? (invoice.hosted_invoice_url ?? null) : null,
  }
}

function addressLines(address: Stripe.Address | null): string[] {
  if (!address) return []
  const cityLine = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(', ')
  return [address.line1, address.line2, cityLine, address.country].filter(
    (line): line is string => Boolean(line),
  )
}

function sum(amounts: { amount: number }[] | null): number {
  return (amounts ?? []).reduce((total, { amount }) => total + amount, 0)
}

/** The customer's invoices, newest first. Drafts aren't shown to customers. */
export async function listInvoices(args: {
  customerId: string
  limit?: number
}): Promise<InvoiceSummary[]> {
  const stripe = getStripe()
  if (!stripe) return []
  const page = await stripe.invoices.list({
    customer: args.customerId,
    limit: args.limit ?? 24,
  })
  return page.data
    .filter((invoice) => invoice.status !== 'draft')
    .map(toSummary)
}

/**
 * One invoice, or null when it doesn't exist or belongs to another customer
 * — the id comes from the URL, so ownership is checked here.
 */
export async function getInvoice(args: {
  customerId: string
  invoiceId: string
}): Promise<InvoiceDetail | null> {
  const stripe = getStripe()
  if (!stripe || !args.invoiceId.startsWith('in_')) return null
  let invoice: Stripe.Invoice
  try {
    // Includes the first 10 lines — plenty for a subscription invoice.
    invoice = await stripe.invoices.retrieve(args.invoiceId)
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) return null
    throw error
  }
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
  if (customerId !== args.customerId || invoice.status === 'draft') return null

  return {
    ...toSummary(invoice),
    issuerName: invoice.account_name,
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
    customerAddress: addressLines(invoice.customer_address),
    periodStart: fromUnix(invoice.period_start),
    periodEnd: fromUnix(invoice.period_end),
    dueAt: invoice.due_date ? fromUnix(invoice.due_date) : null,
    paidAt: invoice.status_transitions.paid_at
      ? fromUnix(invoice.status_transitions.paid_at)
      : null,
    lines: invoice.lines.data.map((line) => ({
      id: line.id,
      description: line.description ?? 'Subscription',
      quantity: line.quantity,
      amountCents: line.amount,
      periodStart: fromUnix(line.period.start),
      periodEnd: fromUnix(line.period.end),
    })),
    subtotalCents: invoice.subtotal,
    discountCents: sum(invoice.total_discount_amounts),
    taxCents: sum(invoice.total_taxes),
    amountPaidCents: invoice.amount_paid,
    amountDueCents: invoice.amount_remaining,
  }
}
