import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { ProfileSection } from '@/components/settings/profile-section'
import { getAuth } from '@/lib/auth'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfileSettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) return null

  return (
    <ProfileSection
      initialName={session.user.name ?? ''}
      initialImage={session.user.image ?? null}
      email={session.user.email}
    />
  )
}
