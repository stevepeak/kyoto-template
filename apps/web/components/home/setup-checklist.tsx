import { CircleCheck, CircleDashed, ListChecks } from 'lucide-react'

import type { SetupItem } from '@/lib/setup-checklist'

/** Inline `code` spans in a how-to line, without pulling in a markdown parser. */
function renderHow(how: string) {
  return how.split(/(`[^`]+`)/).map((part, i) => {
    return part.startsWith('`') && part.endsWith('`') ? (
      <code
        key={i}
        className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  })
}

function ItemRow({ item }: { item: SetupItem }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      {item.done ? (
        <CircleCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
      ) : (
        <CircleDashed
          className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
          {item.title}
          {!item.done && item.required ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Needed for launch
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{item.why}</p>
        {item.done ? null : (
          <p className="mt-1.5 text-sm text-gray-700">{renderHow(item.how)}</p>
        )}
      </div>
    </li>
  )
}

/**
 * What the project owner still has to configure. Outstanding items first,
 * launch-blocking ones before optional ones; finished ones fold away.
 */
export function SetupChecklist({ items }: { items: SetupItem[] }) {
  const todo = items
    .filter((item) => !item.done)
    .sort((a, b) => Number(b.required) - Number(a.required))
  const done = items.filter((item) => item.done)

  return (
    <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <header className="flex items-start gap-3 border-b border-gray-200 bg-gray-50/60 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            Project setup
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {todo.length === 0
              ? 'Everything this deployment can check is configured.'
              : `${done.length} of ${items.length} done. Only admins see this.`}
          </p>
        </div>
        <div className="mt-1 h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${(done.length / items.length) * 100}%` }}
          />
        </div>
      </header>
      <div className="p-5">
        {todo.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {todo.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        ) : null}
        {done.length > 0 ? (
          <details className={todo.length > 0 ? 'mt-4' : ''}>
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
              {done.length} configured
            </summary>
            <ul className="mt-3 divide-y divide-gray-100">
              {done.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  )
}
