'use client'

import { Loader2, LogOut, Monitor, MonitorSmartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { describeUserAgent } from '@/lib/user-agent'

import { FieldMessage, SectionCard } from './section-card'
import { secondaryButtonClass } from './styles'
import { LoadingState } from '@/components/states'

type Session = {
  id: string
  token: string
  createdAt: string | Date
  ipAddress?: string | null
  userAgent?: string | null
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * Newest sign-in first, with this device pinned to the top. Sorted (and
 * labelled) by sign-in time, not activity: Better Auth only bumps `updatedAt`
 * when it refreshes a session, about once a day.
 */
function sortSessions(sessions: Session[], currentId: string | undefined) {
  return [...sessions].sort((a, b) => {
    if (a.id === currentId) return -1
    if (b.id === currentId) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** Every device signed in to this account, with per-device and bulk sign-out. */
export function SessionsSection() {
  const { data: current } = authClient.useSession()
  const currentId = current?.session.id
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({})

  const refreshSessions = useCallback(async () => {
    const { data, error } = await authClient.listSessions()
    if (error) {
      setMsg({ error: error.message || 'Failed to load sessions' })
      setSessions((prev) => prev ?? [])
      return
    }
    setSessions(data ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    void authClient.listSessions().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setMsg({ error: error.message || 'Failed to load sessions' })
        setSessions([])
        return
      }
      setSessions(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRevoke = async (token: string) => {
    setMsg({})
    setRevokingToken(token)
    const { error } = await authClient.revokeSession({ token })
    if (error) {
      setMsg({ error: error.message || 'Failed to sign out that device' })
    } else {
      await refreshSessions()
    }
    setRevokingToken(null)
  }

  const handleRevokeOthers = async () => {
    setMsg({})
    setRevokingOthers(true)
    const { error } = await authClient.revokeOtherSessions()
    if (error) {
      setMsg({ error: error.message || 'Failed to sign out other devices' })
    } else {
      await refreshSessions()
      setMsg({ success: 'Signed out of every other device.' })
    }
    setRevokingOthers(false)
  }

  const others = (sessions ?? []).filter((s) => s.id !== currentId)
  const busy = revokingToken !== null || revokingOthers

  return (
    <SectionCard
      title="Sessions"
      description="Devices signed in to your account. Sign out any you don’t recognise."
      icon={MonitorSmartphone}
      action={
        others.length > 0 ? (
          <button
            type="button"
            onClick={handleRevokeOthers}
            disabled={busy}
            className={secondaryButtonClass}
          >
            {revokingOthers ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            Sign out others
          </button>
        ) : null
      }
    >
      {sessions === null ? (
        <LoadingState />
      ) : (
        <ul className="flex flex-col gap-2">
          {sortSessions(sessions, currentId).map((s) => {
            const isCurrent = s.id === currentId
            const device = describeUserAgent(s.userAgent) ?? 'Unknown device'
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
              >
                <Monitor
                  className="h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 truncate text-sm font-medium text-gray-900">
                    {device}
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        This device
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-gray-500">
                    {[
                      s.ipAddress,
                      `Signed in ${dateFormat.format(new Date(s.createdAt))}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(s.token)}
                    disabled={busy}
                    aria-label={`Sign out ${device}`}
                    title="Sign out"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {revokingToken === s.token ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <FieldMessage error={msg.error} success={msg.success} />
    </SectionCard>
  )
}
