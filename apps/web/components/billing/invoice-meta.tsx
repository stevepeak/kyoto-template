import type { ReactNode } from 'react'

interface InvoiceMetaProps {
  label: string
  children: ReactNode
}

/** A label over a value, for the invoice's who/when blocks. */
export function InvoiceMeta({ label, children }: InvoiceMetaProps) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-6 text-gray-900">{children}</dd>
    </div>
  )
}
