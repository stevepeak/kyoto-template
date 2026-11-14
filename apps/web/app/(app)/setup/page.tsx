import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { ClaudeSetupCard } from '@/components/setup/claude-setup-card'
import { SetupChecklist } from '@/components/setup/setup-checklist'
import { getAuth } from '@/lib/auth'
import { getSetupChecklist } from '@/lib/setup-checklist'
import { canUseWorkflows } from '@/lib/wf-access'

export const metadata: Metadata = { title: 'Setup' }

/** What the project owner still has to configure on this deployment. */
export default async function SetupPage() {
  // The proxy only checks for a cookie; this is the real check.
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect('/login?redirectTo=/setup')
  // The list names unset secrets, so only admins (the 007 allowlist — any
  // signed-in user under `next dev`) may see it.
  if (!canUseWorkflows(session.user.email)) notFound()

  return (
    <main className="flex flex-col items-center gap-6 p-8">
      <ClaudeSetupCard />
      <SetupChecklist items={getSetupChecklist()} />
    </main>
  )
}
