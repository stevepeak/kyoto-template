import type { Metadata } from 'next'
import { Suspense } from 'react'

import { isGoogleEnabled, turnstileSiteKey } from '@/lib/auth'

import { LoginRedirect } from './login-redirect'

export const metadata: Metadata = { title: 'Sign in' }

// Reads bindings (Google, Turnstile config) per request.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* useSearchParams needs a Suspense boundary to avoid opting the page
          out of prerendering. */}
      <Suspense>
        <LoginRedirect
          googleEnabled={isGoogleEnabled()}
          turnstileSiteKey={turnstileSiteKey()}
        />
      </Suspense>
    </main>
  )
}
