'use client'

import { Link2, Loader2, Plus, Unplug, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ClaudeLogo, OpenAILogo } from './brand-logos'
import { McpConnectGuide } from './mcp-connect-guide'
import { FieldMessage, SectionCard } from './section-card'
import { primaryButtonClass, secondaryButtonClass } from './styles'

export type McpClientVendor = 'claude' | 'openai'

const VENDOR_LOGOS = {
  claude: { logo: ClaudeLogo, className: 'text-[#D97757]' },
  openai: { logo: OpenAILogo, className: 'text-gray-900' },
} satisfies Record<McpClientVendor, unknown>

export type McpConnection = {
  /** The consent row — what disconnecting deletes. */
  id: string
  name: string | null
  icon: string | null
  uri: string | null
  /** Recognized assistant, for its logo; null when unknown. */
  vendor: McpClientVendor | null
  createdAt: string | null
}

/** A client's homepage host. The URI is self-registered, so may not parse. */
function hostOf(uri: string | null): string | null {
  if (!uri) return null
  try {
    return new URL(uri).host
  } catch {
    return null
  }
}

/**
 * The assistants this user has approved. Disconnecting deletes the consent,
 * which the app MCP re-checks on every request (see lib/app-mcp.ts) — so access
 * stops immediately rather than when the client's token expires.
 */
export function McpConnectionsSection({
  connections,
  url,
}: {
  connections: McpConnection[]
  /** The app MCP's server URL, for the add-an-assistant guide. */
  url: string
}) {
  const router = useRouter()
  const isEmpty = connections.length === 0
  // With nothing connected the guide IS the section, so it is always open —
  // and starts `adding`, so the first connection doesn't unmount the guide
  // (and its dialog) before the dialog can confirm it.
  const [adding, setAdding] = useState(isEmpty)
  const showGuide = isEmpty || adding
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disconnect = async (id: string) => {
    setPendingId(id)
    setError(null)
    try {
      const res = await fetch('/api/auth/oauth2/delete-consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Could not disconnect.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <SectionCard
      title="Connected assistants"
      description="Assistants you've approved. Disconnect one to revoke its access."
      icon={Link2}
      action={
        isEmpty ? null : (
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            aria-expanded={adding}
            className={adding ? secondaryButtonClass : primaryButtonClass}
          >
            {adding ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {adding ? 'Close' : 'Add assistant'}
          </button>
        )
      }
    >
      {showGuide ? (
        <div className={isEmpty ? '' : 'mb-5 border-b border-gray-200 pb-5'}>
          <p className="mb-4 text-sm text-gray-600">
            {isEmpty
              ? 'No assistants connected yet. Pick yours to get set up.'
              : 'Pick an assistant to get set up.'}
          </p>
          <McpConnectGuide url={url} connectionCount={connections.length} />
        </div>
      ) : null}
      {isEmpty ? null : (
        <ul className="divide-y divide-gray-100">
          {connections.map((connection) => {
            const vendorLogo = connection.vendor
              ? VENDOR_LOGOS[connection.vendor]
              : null
            return (
              <li
                key={connection.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                {vendorLogo ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white">
                    <vendorLogo.logo
                      className={`h-5 w-5 ${vendorLogo.className}`}
                    />
                  </span>
                ) : connection.icon ? (
                  <img
                    src={connection.icon}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md border border-gray-200 object-contain"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400">
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {connection.name ?? 'Unnamed client'}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[
                      hostOf(connection.uri),
                      connection.createdAt
                        ? `Connected ${new Date(connection.createdAt).toLocaleDateString()}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void disconnect(connection.id)}
                  disabled={pendingId !== null}
                  className={secondaryButtonClass}
                >
                  {pendingId === connection.id ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Unplug className="h-4 w-4" aria-hidden="true" />
                  )}
                  Disconnect
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <FieldMessage error={error} />
    </SectionCard>
  )
}
