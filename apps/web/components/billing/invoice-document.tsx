import { Download, ExternalLink } from 'lucide-react'

import {
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/settings/styles'
import { PRODUCT_NAME } from '@/lib/brand'
import { formatDate, formatMoney } from '@/lib/billing/format'
import type { InvoiceDetail } from '@/lib/billing/invoices'

import { InvoiceMeta as Meta } from './invoice-meta'
import { InvoiceStatusBadge } from './invoice-status-badge'

interface InvoiceDocumentProps {
  invoice: InvoiceDetail
}

/**
 * An invoice laid out like the paper one: issuer and status up top, who and
 * when, the line items, then totals. The PDF from Stripe is the legal copy.
 */
export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  const money = (cents: number) =>
    formatMoney({ cents, currency: invoice.currency })
  const issuer = invoice.issuerName ?? PRODUCT_NAME

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {invoice.payUrl ? (
          <a href={invoice.payUrl} className={primaryButtonClass}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Pay {money(invoice.amountDueCents)}
          </a>
        ) : null}
        {invoice.pdfUrl ? (
          <a href={invoice.pdfUrl} className={secondaryButtonClass}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </a>
        ) : null}
      </div>

      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Accent strip across the top of the "paper". */}
        <div className="h-1.5 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500" />

        <div className="p-6 sm:p-10">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white">
                {issuer.charAt(0)}
              </span>
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {issuer}
                </p>
                <p className="text-sm text-gray-500">Invoice</p>
              </div>
            </div>
            <div className="sm:text-right">
              <InvoiceStatusBadge status={invoice.status} size="lg" />
              <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                {money(invoice.totalCents)}
              </p>
              <p className="mt-1 font-mono text-xs text-gray-500">
                {invoice.number ?? invoice.id}
              </p>
            </div>
          </header>

          <dl className="mt-10 grid gap-8 border-y border-gray-100 py-8 sm:grid-cols-3">
            <Meta label="Billed to">
              {invoice.customerName ? (
                <span className="block font-medium">
                  {invoice.customerName}
                </span>
              ) : null}
              {invoice.customerEmail ? (
                <span className="block text-gray-600">
                  {invoice.customerEmail}
                </span>
              ) : null}
              {invoice.customerAddress.map((line) => (
                <span key={line} className="block text-gray-600">
                  {line}
                </span>
              ))}
            </Meta>
            <Meta label="Issued">
              {formatDate(invoice.createdAt)}
              {invoice.paidAt ? (
                <span className="block text-gray-600">
                  Paid {formatDate(invoice.paidAt)}
                </span>
              ) : invoice.dueAt ? (
                <span className="block text-gray-600">
                  Due {formatDate(invoice.dueAt)}
                </span>
              ) : null}
            </Meta>
            <Meta label="Billing period">
              {formatDate(invoice.periodStart)} –{' '}
              {formatDate(invoice.periodEnd)}
            </Meta>
          </dl>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="pb-3 font-medium">
                    Description
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium">
                    Qty
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-gray-900">
                        {line.description}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDate(line.periodStart)} –{' '}
                        {formatDate(line.periodEnd)}
                      </p>
                    </td>
                    <td className="py-4 text-right text-gray-600 tabular-nums">
                      {line.quantity ?? '—'}
                    </td>
                    <td className="py-4 pl-4 text-right font-medium text-gray-900 tabular-nums">
                      {money(line.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-6 ml-auto flex max-w-xs flex-col gap-2 border-t border-gray-200 pt-6 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money(invoice.subtotalCents)}</dd>
            </div>
            {invoice.discountCents > 0 ? (
              <div className="flex justify-between text-gray-600">
                <dt>Discount</dt>
                <dd className="tabular-nums">
                  −{money(invoice.discountCents)}
                </dd>
              </div>
            ) : null}
            {invoice.taxCents > 0 ? (
              <div className="flex justify-between text-gray-600">
                <dt>Tax</dt>
                <dd className="tabular-nums">{money(invoice.taxCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between font-semibold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(invoice.totalCents)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Amount paid</dt>
              <dd className="tabular-nums">{money(invoice.amountPaidCents)}</dd>
            </div>
            <div className="mt-2 flex justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-base font-semibold text-gray-900">
              <dt>Amount due</dt>
              <dd className="tabular-nums">{money(invoice.amountDueCents)}</dd>
            </div>
          </dl>

          <p className="mt-12 text-center text-xs text-gray-400">
            Thank you for your business. {/* TODO: support contact. */}
          </p>
        </div>
      </article>
    </div>
  )
}
