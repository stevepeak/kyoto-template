import type { Metadata } from 'next'

import { ApiKeysSection } from '@/components/settings/api-keys-section'

export const metadata: Metadata = { title: 'API keys' }

export default function ApiKeysSettingsPage() {
  return <ApiKeysSection />
}
