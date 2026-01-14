'use client'

import { AuthCard } from './components/auth-card'
import { TriggerCard } from './components/trigger-card'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Hello World</h1>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AuthCard />
        <TriggerCard />
      </div>
    </main>
  )
}
