'use client'

import { ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { FieldMessage } from '@/components/settings/section-card'
import { primaryButtonClass } from '@/components/settings/styles'
import { authClient } from '@/lib/auth-client'

/**
 * Opens the Stripe billing portal: payment method, billing details, plan
 * changes and cancellation all live there.
 */
export function ManageBillingButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal(): Promise<void> {
    setPending(true)
    setError(null)
    const { error: portalError } = await authClient.subscription.billingPortal({
      returnUrl: '/settings/billing',
    })
    if (portalError) {
      setError(portalError.message ?? 'Could not open the billing portal.')
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={pending}
        className={primaryButtonClass}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        )}
        Manage billing
      </button>
      <FieldMessage error={error} />
    </div>
  )
}
