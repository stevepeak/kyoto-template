import { headers } from 'next/headers'
import Link from 'next/link'

import { SetupChecklist } from '@/components/home/setup-checklist'
import { getAuth } from '@/lib/auth'
import { getSetupChecklist } from '@/lib/setup-checklist'
import { canUseWorkflows } from '@/lib/wf-access'

export default async function HomePage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  // The setup list names unset secrets, so only admins (the 007 allowlist —
  // any signed-in user under `next dev`) see it.
  const showSetup = session ? canUseWorkflows(session.user.email) : false

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
      {session ? null : (
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </Link>
      )}
      {showSetup ? <SetupChecklist items={getSetupChecklist()} /> : null}
    </main>
  )
}
