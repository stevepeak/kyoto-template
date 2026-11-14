import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site-footer'

/** Public pages (sign-in, OAuth consent, legal) — no sidebar, site footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  )
}
