'use client'

import { KeyRound } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import { FieldMessage, SectionCard } from './section-card'
import { inputClass, labelClass, primaryButtonClass } from './styles'
import { LoadingState } from '@/components/states'

const MIN_PASSWORD_LENGTH = 8

type PasswordMode = 'loading' | 'change' | 'none'

export function PasswordSection() {
  const [mode, setMode] = useState<PasswordMode>('loading')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({})

  // Only accounts with an email/password credential have a password to change;
  // Google-only (or passkey-only) accounts don't.
  useEffect(() => {
    let cancelled = false
    void authClient.listAccounts().then(({ data }) => {
      if (cancelled) return
      const hasPassword = (data ?? []).some(
        (a) => a.providerId === 'credential',
      )
      setMode(hasPassword ? 'change' : 'none')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg({})
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMsg({
        error: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setMsg({ error: 'The new passwords don’t match.' })
      return
    }
    setIsSaving(true)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    setIsSaving(false)
    if (error) {
      setMsg({ error: error.message || 'Failed to change password' })
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMsg({ success: 'Password changed. Other devices were signed out.' })
  }

  return (
    <SectionCard
      title="Password"
      description="Changing it signs you out everywhere else."
      icon={KeyRound}
    >
      {mode === 'loading' ? (
        <LoadingState />
      ) : mode === 'none' ? (
        // TODO: let social/passkey-only accounts set a password
        // (Better Auth's server-only `setPassword`).
        <p className="text-sm text-gray-500">
          Your account doesn&apos;t use a password — you sign in with Google or
          a passkey.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="current-password" className={labelClass}>
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className={labelClass}>
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={primaryButtonClass}
            >
              {isSaving ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      )}
      <FieldMessage error={msg.error} success={msg.success} />
    </SectionCard>
  )
}
