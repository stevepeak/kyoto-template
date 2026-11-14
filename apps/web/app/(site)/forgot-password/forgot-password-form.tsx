'use client'

import { type FormEvent, useRef, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import {
  AuthMessage,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../../components/auth-panel'
import {
  captchaFetchOptions,
  Turnstile,
  type TurnstileHandle,
} from '../../components/turnstile'

export function ForgotPasswordForm({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string | null
}) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      // The emailed link validates the token, then lands here with
      // `?token=…` (or `?error=INVALID_TOKEN`).
      redirectTo: '/reset-password',
      ...captchaFetchOptions(captchaToken),
    })
    turnstileRef.current?.reset()
    setIsLoading(false)
    if (error) {
      setError(error.message || 'Failed to send the reset link')
      return
    }
    // The server answers the same whether or not the account exists, so this
    // can't be used to find out who has one.
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <AuthMessage
        success={`If an account exists for ${sentTo}, we’ve sent it a link to choose a new password.`}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Enter your account’s email and we’ll send you a reset link.
      </p>
      <div>
        <label htmlFor="email" className={authLabelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          autoFocus
          className={authInputClass}
          placeholder="you@example.com"
        />
      </div>

      {turnstileSiteKey && (
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onToken={setCaptchaToken}
        />
      )}

      <AuthMessage error={error} />

      <button
        type="submit"
        disabled={isLoading || (Boolean(turnstileSiteKey) && !captchaToken)}
        className={authButtonClass}
      >
        {isLoading ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
