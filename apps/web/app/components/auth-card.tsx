'use client'

import { Fingerprint } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useRef, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { DEMO_USER } from '@/lib/demo-user'

import {
  captchaFetchOptions,
  Turnstile,
  type TurnstileHandle,
} from './turnstile'

// Inlined by Next at build time, so the demo button is stripped from prod.
const IS_DEV = process.env.NODE_ENV === 'development'

type AuthMode = 'signin' | 'signup'

interface AuthCardProps {
  /** Show "Continue with Google" — only when the provider is configured. */
  googleEnabled?: boolean
  /** Where to land after an OAuth round-trip or email confirmation. */
  callbackURL?: string
  /** Turnstile site key — the bot check runs only when set. */
  turnstileSiteKey?: string | null
}

/** Where the confirmation link lands; it then continues to `redirectTo`. */
function verifyEmailCallback(redirectTo: string): string {
  return `/verify-email?redirectTo=${encodeURIComponent(redirectTo)}`
}

export function AuthCard({
  googleEnabled = false,
  callbackURL = '/',
  turnstileSiteKey = null,
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const awaitingCaptcha = Boolean(turnstileSiteKey) && !captchaToken

  const { data: session, isPending } = authClient.useSession()

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
        callbackURL: verifyEmailCallback(callbackURL),
        ...captchaFetchOptions(captchaToken),
      })
      if (error) {
        setError(error.message || 'Failed to sign up')
      } else {
        setSuccess(
          `Almost done — we sent a confirmation link to ${email}. Open it to finish signing up.`,
        )
        setEmail('')
        setPassword('')
        setName('')
      }
    } else {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: verifyEmailCallback(callbackURL),
        ...captchaFetchOptions(captchaToken),
      })
      if (error?.code === 'EMAIL_NOT_VERIFIED') {
        // The server has just sent a fresh link (`sendOnSignIn`).
        setError(
          `Confirm your email first — we sent a new link to ${email}. Check your inbox.`,
        )
      } else if (error) {
        setError(error.message || 'Failed to sign in')
      }
    }

    // Tokens are single-use, whatever the outcome.
    turnstileRef.current?.reset()
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

        {mode === 'signin' && (
          <Link
            href="/forgot-password"
            className="-mt-2 self-end text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </Link>
        )}

        {turnstileSiteKey && (
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onToken={setCaptchaToken}
          />
        )}

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
          disabled={isLoading || awaitingCaptcha}
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
