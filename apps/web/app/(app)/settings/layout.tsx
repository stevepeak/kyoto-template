import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { SettingsNav } from '@/components/settings/settings-nav'
import { getAuth } from '@/lib/auth'

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuth().api.getSession({ headers: await headers() })
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
        <SettingsNav initialImage={session?.user.image ?? null} />
        <div className="flex min-w-0 flex-1 flex-col gap-8">{children}</div>
      </div>
    </div>
  )
}
