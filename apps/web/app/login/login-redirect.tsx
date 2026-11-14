'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { authClient } from '@/lib/auth-client'

import { AuthCard } from '../components/auth-card'

/** Only same-origin paths — never bounce to an attacker-supplied URL. */
function safeRedirect(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export function LoginRedirect({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirectTo'))
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (session) router.replace(redirectTo)
  }, [session, redirectTo, router])

  return <AuthCard googleEnabled={googleEnabled} callbackURL={redirectTo} />
}
