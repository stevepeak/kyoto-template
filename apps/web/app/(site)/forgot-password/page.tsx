import type { Metadata } from 'next'

import { turnstileSiteKey } from '@/lib/auth'

import { AuthPanel } from '../../components/auth-panel'

import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password' }

// Reads bindings (Turnstile config) per request.
export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <AuthPanel title="Reset your password">
      <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey()} />
    </AuthPanel>
  )
}
