'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { AuthMessage, authButtonClass } from '../../components/auth-panel'

/**
 * Asks before acting: the link in an email is GET-able by scanners, so only
 * the button's POST unsubscribes.
 */
export function UnsubscribeConfirm() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<
    | { kind: 'idle' | 'working' }
    | { kind: 'done'; category: string }
    | { kind: 'error' }
  >({ kind: 'idle' })

  const handleUnsubscribe = async () => {
    setState({ kind: 'working' })
    const res = await fetch(
      `/api/unsubscribe?token=${encodeURIComponent(token)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      setState({ kind: 'error' })
      return
    }
    const { category } = await res.json<{ category: string }>()
    setState({ kind: 'done', category })
  }

  if (state.kind === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage
          success={`You won’t get “${state.category}” emails any more.`}
        />
        <p className="text-sm text-gray-600">
          Changed your mind? Manage every email type in{' '}
          <Link
            href="/settings/notifications"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Settings → Notifications
          </Link>
          .
        </p>
      </div>
    )
  }

  if (!token || state.kind === 'error') {
    return (
      <AuthMessage error="This unsubscribe link is invalid. Sign in and use Settings → Notifications instead." />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Stop receiving this type of email? Security and account emails (like
        password resets) will still be sent.
      </p>
      <button
        type="button"
        onClick={() => void handleUnsubscribe()}
        disabled={state.kind === 'working'}
        className={authButtonClass}
      >
        {state.kind === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
    </div>
  )
}
