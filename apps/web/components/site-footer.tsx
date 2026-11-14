import Link from 'next/link'

import { PRIVACY_HREF, TERMS_HREF } from '@/lib/legal/links'

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 px-4 py-6 text-xs text-gray-500">
      <nav className="mx-auto flex max-w-3xl justify-center gap-6">
        <Link href="/pricing" className="hover:text-gray-900">
          Pricing
        </Link>
        <Link href={PRIVACY_HREF} className="hover:text-gray-900">
          Privacy
        </Link>
        <Link href={TERMS_HREF} className="hover:text-gray-900">
          Terms
        </Link>
      </nav>
    </footer>
  )
}
