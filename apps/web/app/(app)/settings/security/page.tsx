import type { Metadata } from 'next'

import { PasskeysSection } from '@/components/settings/passkeys-section'
import { PasswordSection } from '@/components/settings/password-section'
import { SessionsSection } from '@/components/settings/sessions-section'

export const metadata: Metadata = { title: 'Security' }

export default function SecuritySettingsPage() {
  return (
    <>
      <PasswordSection />
      <PasskeysSection />
      <SessionsSection />
    </>
  )
}
