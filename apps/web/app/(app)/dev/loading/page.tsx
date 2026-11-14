import { Fingerprint, KeySquare, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SectionCard } from '@/components/settings/section-card'
import { primaryButtonClass } from '@/components/settings/styles'
import { EmptyState, LoadingState } from '@/components/states'

export const metadata: Metadata = { title: 'Loading & empty states' }

/** Dev-only gallery of the shared states in components/states.tsx. */
export default function DevLoadingPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Loading &amp; empty states
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every variant of <code>LoadingState</code> and <code>EmptyState</code>
          , as they render inside a section card.
        </p>
      </header>

      <SectionCard title="LoadingState" description="Default inline variant.">
        <LoadingState />
      </SectionCard>

      <SectionCard
        title="LoadingState — block"
        description={'variant="block" with a custom label.'}
      >
        <LoadingState variant="block" label="Fetching your keys…" />
      </SectionCard>

      <SectionCard title="EmptyState" description="Title only.">
        <EmptyState title="No activity recorded yet" />
      </SectionCard>

      <SectionCard title="EmptyState — icon and description" icon={Fingerprint}>
        <EmptyState
          icon={Fingerprint}
          title="No passkeys yet"
          description="Add one to sign in faster on this device."
        />
      </SectionCard>

      <SectionCard title="EmptyState — with action" icon={KeySquare}>
        <EmptyState
          icon={KeySquare}
          title="No API keys yet"
          description="Create one to call the API from your own scripts and tools."
          action={
            <button type="button" className={primaryButtonClass}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create key
            </button>
          }
        />
      </SectionCard>
    </main>
  )
}
