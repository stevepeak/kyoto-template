'use client'

import { Fingerprint } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'

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

/** List, add, and remove the signed-in user's passkeys. */
export function PasskeysCard() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [passkeyName, setPasskeyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
        return
      }
      setPasskeys(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddPasskey = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    const { error } = await authClient.passkey.addPasskey({
      name: passkeyName.trim() || inferDeviceName(),
    })
    if (error) {
      setError(error.message || 'Failed to add passkey')
    } else {
      setSuccess('Passkey added')
      setPasskeyName('')
      await refreshPasskeys()
    }
    setIsLoading(false)
  }

  const handleDeletePasskey = async (id: string) => {
    setError(null)
    setSuccess(null)
    const { error } = await authClient.passkey.deletePasskey({ id })
    if (error) {
      setError(error.message || 'Failed to remove passkey')
      return
    }
    await refreshPasskeys()
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Passkeys</h2>
      <p className="mb-4 text-sm text-gray-600">
        Sign in with your fingerprint, face, or device lock instead of a
        password.
      </p>

      {passkeys === null ? (
        <p className="mb-4 text-sm text-gray-500">Loading passkeys...</p>
      ) : passkeys.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">No passkeys yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <span className="flex flex-col">
                <span className="text-gray-800">
                  {pk.name || 'Unnamed passkey'}
                </span>
                <span className="text-xs text-gray-500">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleDeletePasskey(pk.id)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAddPasskey}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={passkeyName}
          onChange={(e) => setPasskeyName(e.target.value)}
          placeholder="Passkey name (defaults to this device)"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          Add a passkey
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-600">
          {success}
        </p>
      )}
    </section>
  )
}
