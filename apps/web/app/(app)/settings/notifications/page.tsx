import type { Metadata } from 'next'

import { NotificationsSection } from '@/components/settings/notifications-section'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsSettingsPage() {
  return <NotificationsSection />
}
