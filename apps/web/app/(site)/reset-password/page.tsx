import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthPanel } from '../../components/auth-panel'

import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Choose a new password' }

export default function ResetPasswordPage() {
  return (
    <AuthPanel title="Choose a new password">
      {/* useSearchParams needs a Suspense boundary to avoid opting the page
          out of prerendering. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthPanel>
  )
}
