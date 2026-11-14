import type { Metadata } from 'next'

import { LegalDocumentPage } from '@/components/legal/document-page'
import { TERMS_OF_USE } from '@/lib/legal/terms-of-use'

export const metadata: Metadata = {
  title: TERMS_OF_USE.title,
  description: 'The terms that govern use of the service.',
}

export default function TermsPage() {
  return <LegalDocumentPage document={TERMS_OF_USE} />
}
