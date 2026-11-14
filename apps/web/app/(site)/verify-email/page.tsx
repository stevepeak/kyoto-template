import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthPanel } from '../../components/auth-panel'

import { VerifyEmailResult } from './verify-email-result'

export const metadata: Metadata = { title: 'Confirm your email' }

export default function VerifyEmailPage() {
  return (
    <AuthPanel title="Confirm your email">
      {/* useSearchParams needs a Suspense boundary to avoid opting the page
          out of prerendering. */}
      <Suspense>
        <VerifyEmailResult />
      </Suspense>
    </AuthPanel>
  )
}
