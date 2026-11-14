'use client'

import Link from 'next/link'

import { authClient } from '@/lib/auth-client'

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <svg
        viewBox="0 0 64 64"
        className="text-muted-foreground size-24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="22" height="30" rx="3" />
        <rect x="36" y="6" width="22" height="16" rx="3" />
        <rect x="6" y="42" width="22" height="16" rx="3" />
        <rect x="36" y="28" width="22" height="30" rx="3" />
      </svg>
      {!isPending && !session && (
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </Link>
      )}
    </main>
  )
}
