import { EMAIL_PREVIEWS, findEmailPreviewVariant } from '@app/email'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { EmailViewer } from '@/components/emails/email-viewer'
import { getAuth } from '@/lib/auth'
import { configuredAppUrl } from '@/lib/mcp-resources'
import { canUseWorkflows } from '@/lib/wf-access'

export const metadata: Metadata = { title: 'Emails' }

interface EmailsPageProps {
  searchParams: Promise<{ template?: string; variant?: string }>
}

/**
 * Gallery of every transactional mail the product sends, rendered with sample
 * data by the same code that sends it. Selection lives in the URL
 * (`?template=&variant=`) so a specific mail can be linked to.
 *
 * Rendered on the server straight from `@app/email`'s catalogue — nothing here
 * touches the database or sends anything.
 */
export default async function EmailsPage({ searchParams }: EmailsPageProps) {
  // The proxy only checks for a cookie; this is the real check.
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect('/login?redirectTo=/emails')
  if (!canUseWorkflows(session.user.email)) notFound()

  const params = await searchParams
  const first = EMAIL_PREVIEWS[0]
  const templateId = params.template ?? first.id
  const template = EMAIL_PREVIEWS.find((t) => t.id === templateId)
  const variantId = params.variant ?? template?.variants[0].id ?? ''
  const variant = findEmailPreviewVariant(templateId, variantId)
  if (!template || !variant) notFound()

  // The same origin the real senders build links against, so previewed links
  // match what a recipient gets.
  const mail = await variant.render(
    configuredAppUrl() ?? 'http://localhost:3000',
  )

  return (
    <main className="flex h-full flex-col">
      <header className="border-b border-gray-200 px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Emails
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every mail the product sends, rendered with sample data by the code
          that sends it.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 overflow-y-auto border-b border-gray-200 p-4 md:w-72 md:border-r md:border-b-0">
          <nav className="space-y-5">
            {EMAIL_PREVIEWS.map((t) => (
              <section key={t.id}>
                <h2 className="text-sm font-medium text-gray-900">{t.name}</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {t.sentWhen}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {t.variants.map((v) => {
                    const active = t.id === template.id && v.id === variant.id
                    return (
                      <li key={v.id}>
                        <Link
                          href={`/emails?template=${t.id}&variant=${v.id}`}
                          aria-current={active ? 'page' : undefined}
                          className={`block rounded-md px-2 py-1.5 text-sm ${
                            active
                              ? 'bg-gray-100 font-medium text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {v.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </aside>

        <EmailViewer
          // Remount per mail so the frame doesn't keep the previous document's
          // scroll position.
          key={`${template.id}/${variant.id}`}
          title={`${template.name} — ${variant.label}`}
          subject={mail.subject}
          description={variant.description}
          html={mail.html}
          text={mail.text}
        />
      </div>
    </main>
  )
}
