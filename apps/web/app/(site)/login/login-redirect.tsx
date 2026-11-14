'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { authClient } from '@/lib/auth-client'
import { PRIVACY_HREF, TERMS_HREF } from '@/lib/legal/links'
import { safeRedirect } from '@/lib/safe-redirect'

import { AuthCard } from '../../components/auth-card'

interface LoginRedirectProps {
  googleEnabled: boolean
  turnstileSiteKey: string | null
}

export function LoginRedirect({
  googleEnabled,
  turnstileSiteKey,
}: LoginRedirectProps) {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirectTo'))
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (session) router.replace(redirectTo)
  }, [session, redirectTo, router])

  return (
    <div className="flex flex-col items-center gap-4">
      <AuthCard
        googleEnabled={googleEnabled}
        callbackURL={redirectTo}
        turnstileSiteKey={turnstileSiteKey}
      />
      <p className="max-w-sm text-center text-xs text-gray-500">
        By continuing you agree to the{' '}
        <Link href={TERMS_HREF} className="underline hover:text-gray-900">
          Terms
        </Link>{' '}
        and{' '}
        <Link href={PRIVACY_HREF} className="underline hover:text-gray-900">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
