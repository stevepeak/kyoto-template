import type { Metadata } from 'next'

import { LegalDocumentPage } from '@/components/legal/document-page'
import { PRIVACY_POLICY } from '@/lib/legal/privacy-policy'

export const metadata: Metadata = {
  title: PRIVACY_POLICY.title,
  description: 'How we collect, use and share personal information.',
}

export default function PrivacyPage() {
  return <LegalDocumentPage document={PRIVACY_POLICY} />
}
