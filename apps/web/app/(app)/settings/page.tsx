import type { Metadata } from 'next'

import { PasskeysCard } from '@/components/settings/passkeys-card'

export const metadata: Metadata = { title: 'Settings' }

/** The signed-in user's account settings. */
export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <PasskeysCard />
    </main>
  )
}
