import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  /** Lets the eye find a section by shape before reading its title. */
  icon?: LucideIcon
  /** Rendered on the right of the header band, e.g. an "Add" button. */
  action?: ReactNode
  children: ReactNode
}

/**
 * A bordered card with a tinted header band, so sections stacked on one page
 * read as separate things rather than one long run of headings and fields.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <header className="flex items-start gap-3 border-b border-gray-200 bg-gray-50/60 px-5 py-4">
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

interface FieldMessageProps {
  error?: string | null
  success?: string | null
}

export function FieldMessage({ error, success }: FieldMessageProps) {
  if (error) {
    return (
      <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
        {error}
      </p>
    )
  }
  if (success) {
    return (
      <p className="mt-3 rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">
        {success}
      </p>
    )
  }
  return null
}
