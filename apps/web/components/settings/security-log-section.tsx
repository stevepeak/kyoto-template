import type { AuditEventDetail, AuditEventType } from '@app/db'
import { History } from 'lucide-react'

import { describeUserAgent } from '@/lib/user-agent'

import { SectionCard } from './section-card'
import { EmptyState } from '@/components/states'

export type SecurityEventEntry = {
  id: string
  type: AuditEventType
  ipAddress: string | null
  userAgent: string | null
  detail: AuditEventDetail | null
  createdAt: string
}

/** One line per event, in the account owner's words. */
function describeEvent(entry: SecurityEventEntry): string {
  const name = entry.detail?.name
  switch (entry.type) {
    case 'sign_in':
      return entry.detail?.method
        ? `Signed in with ${entry.detail.method}`
        : 'Signed in'
    case 'impersonated':
      return 'An administrator signed in as you'
    case 'password_changed':
      return 'Password changed'
    case 'password_reset':
      return 'Password reset by email link'
    case 'passkey_added':
      return name ? `Passkey “${name}” added` : 'Passkey added'
    case 'api_key_created':
      return name ? `API key “${name}” created` : 'API key created'
    case 'api_key_deleted':
      return 'API key deleted'
    case 'mcp_tool_call':
      return 'Assistant tool call'
  }
}

/**
 * Recent sign-ins and credential changes on this account, so a person can spot
 * one they didn't make. Assistant tool calls have their own log under MCP.
 */
export function SecurityLogSection({
  entries,
}: {
  entries: SecurityEventEntry[]
}) {
  return (
    <SectionCard
      title="Security log"
      description="Recent sign-ins and changes to how you sign in."
      icon={History}
    >
      {entries.length === 0 ? (
        <EmptyState icon={History} title="No activity recorded yet" />
      ) : (
        <ul className="-my-2 divide-y divide-gray-100">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col py-2.5">
              <span className="text-sm text-gray-900">
                {describeEvent(entry)}
              </span>
              <span className="text-xs text-gray-500">
                {[describeUserAgent(entry.userAgent), entry.ipAddress]
                  .filter(Boolean)
                  .join(' · ')}
                {entry.userAgent || entry.ipAddress ? ' · ' : ''}
                <time dateTime={entry.createdAt} suppressHydrationWarning>
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
