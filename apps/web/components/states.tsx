import { Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface LoadingStateProps {
  /** Announced to screen readers and shown next to the spinner. */
  label?: string
  /** `block` pads and centers the spinner, for a whole card or page. */
  variant?: 'inline' | 'block'
}

/** What a list, card or page shows while its data is on the way. */
export function LoadingState({
  label = 'Loading…',
  variant = 'inline',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={
        variant === 'block'
          ? 'flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground'
          : 'flex items-center gap-2 text-sm text-muted-foreground'
      }
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  /** What will fill this space, or how to fill it. */
  description?: ReactNode
  icon?: LucideIcon
  /** E.g. the button that creates the first item. */
  action?: ReactNode
}

/** What a list shows when it has nothing in it yet. */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-8 text-center">
      {Icon ? (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
