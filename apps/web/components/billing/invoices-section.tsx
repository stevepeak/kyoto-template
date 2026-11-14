import { ChevronRight, Download, Receipt } from 'lucide-react'
import Link from 'next/link'

import { SectionCard } from '@/components/settings/section-card'
import { EmptyState } from '@/components/states'
import { formatDate, formatMoney } from '@/lib/billing/format'
import type { InvoiceSummary } from '@/lib/billing/invoices'

import { InvoiceStatusBadge } from './invoice-status-badge'

interface InvoicesSectionProps {
  invoices: InvoiceSummary[]
}

export function InvoicesSection({ invoices }: InvoicesSectionProps) {
  return (
    <SectionCard
      title="Invoices"
      description="Every charge on your account. Receipts are also emailed to you."
      icon={Receipt}
    >
      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Your invoices will show up here after your first payment."
        />
      ) : (
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                <th scope="col" className="px-5 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Invoice
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="group hover:bg-gray-50/70">
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-900">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-gray-600">
                    {invoice.number ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap text-gray-900 tabular-nums">
                    {formatMoney({
                      cents: invoice.totalCents,
                      currency: invoice.currency,
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`Download invoice ${invoice.number ?? ''} as PDF`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                      <Link
                        href={`/settings/billing/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        View
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
