import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OAuthConsent } from '@/components/oauth-consent'

export const metadata: Metadata = { title: 'Authorize application' }

export default function OAuthConsentPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      {/* The pending authorization arrives in the query string. */}
      <Suspense>
        <OAuthConsent />
      </Suspense>
    </main>
  )
}
