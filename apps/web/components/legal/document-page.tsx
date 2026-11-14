import type { LegalDocument } from '@/lib/legal/blocks'

import { LegalDocumentView } from './document-view'

/**
 * The public page for one legal document. Lives outside any auth gate: people
 * must be able to read the terms before they have an account.
 */
export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  // Placeholder copy announces itself. When the real text lands, the version
  // stops saying "placeholder" and this banner disappears on its own.
  const isDraft = document.version.includes('placeholder')

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        {isDraft ? (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Draft — not final. This text is a template and will be replaced in
            full before launch.
          </p>
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <LegalDocumentView document={document} />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-gray-500">
          <div className="flex gap-1.5">
            <dt>Version</dt>
            <dd className="font-mono text-gray-900">{document.version}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Effective</dt>
            <dd className="text-gray-900">{document.effectiveDate}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
