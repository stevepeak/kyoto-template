'use client'

import { Loader2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'

/**
 * Pinned above the app while an admin is signed in as someone else, so they
 * can't forget whose account they're acting in — and can get back to theirs.
 */
export function ImpersonationBanner({ email }: { email: string }) {
  const router = useRouter()
  const [stopping, setStopping] = useState(false)

  const handleStop = async () => {
    setStopping(true)
    await authClient.admin.stopImpersonating()
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <span className="truncate">
        You’re signed in as <strong className="font-medium">{email}</strong>
      </span>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
      >
        {stopping ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Stop impersonating
      </button>
    </div>
  )
}
