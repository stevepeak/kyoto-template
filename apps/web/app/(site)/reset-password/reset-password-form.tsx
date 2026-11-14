'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import {
  AuthMessage,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../../components/auth-panel'

// Matches the sign-up form and Settings → Password.
const MIN_PASSWORD_LENGTH = 8

/**
 * Lands here from the emailed link, which Better Auth has already checked:
 * `?token=…` when it is valid, `?error=INVALID_TOKEN` when it is unknown,
 * used or expired.
 */
export function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!token || params.get('error')) {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage error="This reset link is invalid or has expired. Links work once, for a limited time." />
        <Link
          href="/forgot-password"
          className={`${authButtonClass} text-center`}
        >
          Send a new link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage success="Password changed. You’ve been signed out everywhere else — sign in with the new password." />
        <Link href="/login" className={`${authButtonClass} text-center`}>
          Sign in
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The passwords don’t match.')
      return
    }
    setIsLoading(true)
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setIsLoading(false)
    if (error) {
      setError(error.message || 'Failed to reset password')
      return
    }
    setDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="new-password" className={authLabelClass}>
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          autoFocus
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className={authLabelClass}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={authInputClass}
        />
      </div>

      <AuthMessage error={error} />

      <button type="submit" disabled={isLoading} className={authButtonClass}>
        {isLoading ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
