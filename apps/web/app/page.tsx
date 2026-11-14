'use client'

import Link from 'next/link'

import { authClient } from '@/lib/auth-client'

import { AuthCard } from './components/auth-card'
import { TriggerCard } from './components/trigger-card'

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Hello World</h1>
      {!isPending && !session && (
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </Link>
      )}
      {session && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <AuthCard />
          <TriggerCard />
        </div>
      )}
    </main>
  )
}
