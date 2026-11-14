import Link from 'next/link'
import type { ReactNode } from 'react'

// Same look as AuthCard, for the single-purpose auth pages (forgot / reset
// password, email confirmation).

export const authInputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

export const authLabelClass = 'mb-1 block text-sm font-medium text-gray-700'

export const authButtonClass =
  'w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400'

export function AuthPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">{title}</h1>
        {children}
      </div>
      <Link
        href="/login"
        className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500"
      >
        Back to sign in
      </Link>
    </main>
  )
}

export function AuthMessage({
  error,
  success,
}: {
  error?: string | null
  success?: string | null
}) {
  if (error) {
    return (
      <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>
    )
  }
  if (success) {
    return (
      <p className="rounded-md bg-green-50 p-2 text-sm text-green-600">
        {success}
      </p>
    )
  }
  return null
}
