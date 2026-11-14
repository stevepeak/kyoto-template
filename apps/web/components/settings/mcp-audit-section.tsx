'use client'

import { ChevronRight, ScrollText } from 'lucide-react'

import { SectionCard } from './section-card'

export type McpAuditEntry = {
  id: string
  tool: string
  intent: string
  arguments: unknown
  ok: boolean
  error: string | null
  durationMs: number
  createdAt: string
  clientId: string
  clientName: string | null
}

/**
 * Recent app MCP tool calls, each with the reason the assistant gave. A row
 * opens to show what was sent and, for a failure, what came back.
 */
export function McpAuditSection({ entries }: { entries: McpAuditEntry[] }) {
  return (
    <SectionCard
      title="Audit log"
      description="Recent tool calls from your assistants, and why they made them."
      icon={ScrollText}
    >
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No calls yet. They'll appear here as your assistants use the tools.
        </p>
      ) : (
        <ul className="-my-1 divide-y divide-gray-100">
          {entries.map((entry) => (
            <li key={entry.id}>
              <details className="group py-1">
                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md px-2 py-2 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-90"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{entry.intent}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">
                        {entry.tool}
                      </code>
                      <span>{entry.clientName ?? 'Unknown client'}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={entry.createdAt} suppressHydrationWarning>
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.ok
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {entry.ok ? 'OK' : 'Failed'}
                  </span>
                </summary>
                <dl className="mt-1 mb-2 ml-9 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-md bg-gray-50 p-3 text-xs">
                  <dt className="text-gray-500">Client ID</dt>
                  <dd className="truncate font-mono text-gray-800">
                    {entry.clientId}
                  </dd>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="text-gray-800">{entry.durationMs} ms</dd>
                  <dt className="text-gray-500">Arguments</dt>
                  <dd>
                    <pre className="overflow-x-auto font-mono whitespace-pre-wrap text-gray-800">
                      {JSON.stringify(entry.arguments ?? {}, null, 2)}
                    </pre>
                  </dd>
                  {entry.error ? (
                    <>
                      <dt className="text-gray-500">Error</dt>
                      <dd className="font-mono whitespace-pre-wrap text-red-700">
                        {entry.error}
                      </dd>
                    </>
                  ) : null}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
