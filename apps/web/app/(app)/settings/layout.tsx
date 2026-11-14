import type { ReactNode } from 'react'

import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and how you sign in.
        </p>
      </header>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <SettingsNav />
        <div className="flex min-w-0 flex-1 flex-col gap-8">{children}</div>
      </div>
    </div>
  )
}
