'use client'

import { Fingerprint, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import { FieldMessage, SectionCard } from './section-card'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './styles'

type Passkey = {
  id: string
  name?: string | null
  createdAt: string | Date
}

function inferDeviceName(): string {
  if (typeof navigator === 'undefined') return ''

  const uaData = (
    navigator as Navigator & {
      userAgentData?: {
        brands: { brand: string; version: string }[]
        platform: string
      }
    }
  ).userAgentData
  const ua = navigator.userAgent

  let browser = ''
  if (uaData?.brands) {
    const known = uaData.brands.find(
      (b) => !/Not.?A.?Brand/i.test(b.brand) && !/Chromium/i.test(b.brand),
    )
    browser = known?.brand ?? ''
  }
  if (!browser) {
    if (/Edg\//.test(ua)) browser = 'Edge'
    else if (/OPR\//.test(ua)) browser = 'Opera'
    else if (/Firefox\//.test(ua)) browser = 'Firefox'
    else if (/Chrome\//.test(ua)) browser = 'Chrome'
    else if (/Safari\//.test(ua)) browser = 'Safari'
  }

  let platform = uaData?.platform ?? ''
  if (!platform) {
    if (/iPhone/.test(ua)) platform = 'iPhone'
    else if (/iPad/.test(ua)) platform = 'iPad'
    else if (/Android/.test(ua)) platform = 'Android'
    else if (/Mac/.test(ua)) platform = 'macOS'
    else if (/Win/.test(ua)) platform = 'Windows'
    else if (/Linux/.test(ua)) platform = 'Linux'
  }

  if (browser && platform) return `${browser} on ${platform}`
  return browser || platform || 'Passkey'
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** List, add, and remove the signed-in user's passkeys. */
export function PasskeysSection() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshPasskeys = useCallback(async () => {
    const { data, error: listError } =
      await authClient.passkey.listUserPasskeys()
    if (listError) {
      setError(listError.message || 'Failed to load passkeys')
      return
    }
    setPasskeys(data ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    void authClient.passkey.listUserPasskeys().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setError(error.message || 'Failed to load passkeys')
        setPasskeys([])
        return
      }
      setPasskeys(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openAddForm = () => {
    setError(null)
    setPasskeyName(inferDeviceName())
    setAdding(true)
  }

  const handleAddPasskey = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    const { error } = await authClient.passkey.addPasskey({
      name: passkeyName.trim() || inferDeviceName(),
    })
    if (error) {
      setError(error.message || 'Failed to add passkey')
    } else {
      setAdding(false)
      setPasskeyName('')
      await refreshPasskeys()
    }
    setIsSaving(false)
  }

  const handleDeletePasskey = async (id: string) => {
    setError(null)
    setDeletingId(id)
    const { error } = await authClient.passkey.deletePasskey({ id })
    if (error) {
      setError(error.message || 'Failed to remove passkey')
    } else {
      await refreshPasskeys()
    }
    setDeletingId(null)
  }

  return (
    <SectionCard
      title="Passkeys"
      description="Sign in with your fingerprint, face, or device lock instead of a password."
      icon={Fingerprint}
      action={
        adding ? null : (
          <button
            type="button"
            onClick={openAddForm}
            className={secondaryButtonClass}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        )
      }
    >
      {adding && (
        <form
          onSubmit={handleAddPasskey}
          className="mb-5 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <label htmlFor="passkey-name" className={labelClass}>
            Name this passkey
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="passkey-name"
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              autoFocus
              className={`${inputClass} sm:flex-1`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                disabled={isSaving}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={primaryButtonClass}
              >
                {isSaving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Continue
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Your browser will ask you to confirm with your device.
          </p>
        </form>
      )}

      {passkeys === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-gray-500">
          No passkeys yet. Add one to sign in faster on this device.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
            >
              <KeyRound
                className="h-4 w-4 shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-gray-900">
                  {pk.name || 'Unnamed passkey'}
                </span>
                <span className="text-xs text-gray-500">
                  Added {dateFormat.format(new Date(pk.createdAt))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeletePasskey(pk.id)}
                disabled={deletingId !== null}
                aria-label={`Remove ${pk.name || 'passkey'}`}
                title="Remove"
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === pk.id ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldMessage error={error} />
    </SectionCard>
  )
}
