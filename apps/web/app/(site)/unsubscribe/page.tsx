import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthPanel } from '../../components/auth-panel'
import { UnsubscribeConfirm } from './unsubscribe-confirm'

export const metadata: Metadata = { title: 'Unsubscribe' }

export default function UnsubscribePage() {
  return (
    <AuthPanel title="Unsubscribe">
      {/* useSearchParams needs a Suspense boundary to avoid opting the page
          out of prerendering. */}
      <Suspense>
        <UnsubscribeConfirm />
      </Suspense>
    </AuthPanel>
  )
}
