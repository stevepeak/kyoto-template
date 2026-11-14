import type { InvoiceStatus } from '@/lib/billing/invoices'

const STYLES: Record<InvoiceStatus, { label: string; className: string }> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  open: {
    label: 'Due',
    className: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  },
  uncollectible: {
    label: 'Unpaid',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  void: {
    label: 'Void',
    className: 'bg-muted text-muted-foreground ring-border',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground ring-border',
  },
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  size?: 'sm' | 'lg'
}

export function InvoiceStatusBadge({
  status,
  size = 'sm',
}: InvoiceStatusBadgeProps) {
  const { label, className } = STYLES[status]
  const sizing = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizing} ${className}`}
    >
      {label}
    </span>
  )
}
