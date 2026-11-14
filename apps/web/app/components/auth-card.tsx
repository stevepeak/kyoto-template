'use client'

import { Fingerprint } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { DEMO_USER } from '@/lib/demo-user'

// Inlined by Next at build time, so the demo button is stripped from prod.
const IS_DEV = process.env.NODE_ENV === 'development'

type AuthMode = 'signin' | 'signup'

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

interface AuthCardProps {
  /** Show "Continue with Google" — only when the provider is configured. */
  googleEnabled?: boolean
  /** Where to land after an OAuth round-trip. */
  callbackURL?: string
}

export function AuthCard({
  googleEnabled = false,
  callbackURL = '/',
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [passkeyName, setPasskeyName] = useState('')

  const { data: session, isPending } = authClient.useSession()

  const refreshPasskeys = useCallback(async () => {
    const { data, error: listError } =
      await authClient.passkey.listUserPasskeys()
    if (listError) {
      setError(listError.message || 'Failed to load passkeys')
      return
    }
    setPasskeys(data ?? [])
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
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
  }, [userId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'signup') {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
      })
      if (error) {
        setError(error.message || 'Failed to sign up')
      } else {
        setSuccess('Account created successfully!')
        setEmail('')
        setPassword('')
        setName('')
      }
    } else {
      const { error } = await authClient.signIn.email({
        email,
        password,
      })
      if (error) {
        setError(error.message || 'Failed to sign in')
      }
    }

    setIsLoading(false)
  }

  const handleDemoSignIn = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    const { error } = await authClient.signIn.email({
      email: DEMO_USER.email,
      password: DEMO_USER.password,
    })
    if (error) {
      setError(
        error.message ||
          'Demo sign-in failed — run `bun run db:seed:local` in apps/web',
      )
    }
    setIsLoading(false)
  }

  const handlePasskeySignIn = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    const { error } = await authClient.signIn.passkey()
    if (error) {
      setError(error.message || 'Failed to sign in with passkey')
    }
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
      errorCallbackURL: '/login',
    })
    if (error) {
      setError(error.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

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

  const handleSignOut = async () => {
    await authClient.signOut()
  }

  if (isPending) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    )
  }

  if (session) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Welcome, {session.user.name}!
        </h2>
        <p className="mb-4 text-sm text-gray-600">{session.user.email}</p>

        <div className="mb-4 border-t border-gray-200 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Passkeys</h3>

          {passkeys === null ? (
            <p className="text-sm text-gray-500">Loading passkeys...</p>
          ) : passkeys.length === 0 ? (
            <p className="mb-2 text-sm text-gray-500">No passkeys yet.</p>
          ) : (
            <ul className="mb-2 flex flex-col gap-2">
              {passkeys.map((pk) => (
                <li
                  key={pk.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {pk.name || 'Unnamed passkey'}
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

          <form onSubmit={handleAddPasskey} className="flex flex-col gap-2">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="Passkey name (defaults to this device)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Add a passkey
            </button>
          </form>
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-600">
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
      </h2>

      {mode === 'signin' && (
        <>
          {IS_DEV && (
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="mb-3 w-full rounded-md border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Dev: sign in as {DEMO_USER.email}
            </button>
          )}
          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={isLoading}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <Fingerprint className="h-4 w-4" aria-hidden="true" />
            Sign in with passkey
          </button>
          {googleEnabled && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Continue with Google
            </button>
          )}
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            <span>or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'signup' && (
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'username webauthn' : 'username'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            // Only enforced on sign-up so the seeded demo account (admin) can sign in.
            minLength={mode === 'signup' ? 8 : undefined}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md bg-green-50 p-2 text-sm text-green-600">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )
}
