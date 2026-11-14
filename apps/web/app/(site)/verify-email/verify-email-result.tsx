'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { safeRedirect } from '@/lib/safe-redirect'

import {
  AuthMessage,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../../components/auth-panel'

/**
 * Where Better Auth's `/api/auth/verify-email` lands. On success it has
 * already marked the address verified and signed the user in
 * (`autoSignInAfterVerification`), so this just continues to `redirectTo`. On
 * failure it appends `?error=` (TOKEN_EXPIRED, INVALID_TOKEN, …) and the user
 * can ask for a fresh link.
 */
export function VerifyEmailResult() {
  const router = useRouter()
  const params = useSearchParams()
  const error = params.get('error')
  const redirectTo = safeRedirect(params.get('redirectTo'))
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!error && session) router.replace(redirectTo)
  }, [error, session, redirectTo, router])

  if (error)
    return (
      <ResendForm redirectTo={redirectTo} expired={error === 'TOKEN_EXPIRED'} />
    )

  if (isPending || session) {
    return <AuthMessage success="Email confirmed — taking you in…" />
  }
  // Verified, but no session — e.g. the link was opened in another browser.
  return (
    <div className="flex flex-col gap-4">
      <AuthMessage success="Email confirmed. Sign in to continue." />
      <button
        type="button"
        onClick={() =>
          router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
        }
        className={authButtonClass}
      >
        Sign in
      </button>
    </div>
  )
}

function ResendForm({
  redirectTo,
  expired,
}: {
  redirectTo: string
  expired: boolean
}) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg({})
    setIsLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `/verify-email?redirectTo=${encodeURIComponent(redirectTo)}`,
    })
    setIsLoading(false)
    if (error) {
      setMsg({ error: error.message || 'Failed to send a new link' })
      return
    }
    setMsg({
      success: `If ${email} still needs confirming, a new link is on its way.`,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthMessage
        error={
          expired
            ? 'This confirmation link has expired.'
            : 'This confirmation link is invalid or has already been used.'
        }
      />
      <div>
        <label htmlFor="email" className={authLabelClass}>
          Send a new link to
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className={authInputClass}
          placeholder="you@example.com"
        />
      </div>
      <AuthMessage error={msg.error} success={msg.success} />
      <button type="submit" disabled={isLoading} className={authButtonClass}>
        {isLoading ? 'Sending…' : 'Send new link'}
      </button>
    </form>
  )
}
