import type { Metadata } from 'next'

import { PasskeysSection } from '@/components/settings/passkeys-section'
import { PasswordSection } from '@/components/settings/password-section'

export const metadata: Metadata = { title: 'Security' }

export default function SecuritySettingsPage() {
  return (
    <>
      <PasswordSection />
      <PasskeysSection />
    </>
  )
}
