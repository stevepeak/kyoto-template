import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { PasskeysSection } from '@/components/settings/passkeys-section'
import { PasswordSection } from '@/components/settings/password-section'
import { SecurityLogSection } from '@/components/settings/security-log-section'
import { SessionsSection } from '@/components/settings/sessions-section'
import { listSecurityEvents } from '@/lib/audit'
import { getAuth } from '@/lib/auth'

export const metadata: Metadata = { title: 'Security' }

export default async function SecuritySettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  const events = session ? await listSecurityEvents(session.user.id) : []

  return (
    <>
      <PasswordSection />
      <PasskeysSection />
      <SessionsSection />
      <SecurityLogSection entries={events} />
    </>
  )
}
