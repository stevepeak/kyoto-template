import { Bell } from 'lucide-react'
import type { Metadata } from 'next'

import { SectionCard } from '@/components/settings/section-card'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsSettingsPage() {
  return (
    <SectionCard
      title="Notifications"
      description="Choose what we email you about."
      icon={Bell}
    >
      {/* TODO: notification preferences. */}
      <p className="text-sm text-gray-500">
        Nothing to configure yet — notification preferences are coming soon.
      </p>
    </SectionCard>
  )
}
