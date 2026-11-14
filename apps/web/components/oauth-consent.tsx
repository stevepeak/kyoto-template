'use client'

import { Check, ShieldCheck, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { PRODUCT_NAME } from '@/lib/brand'

// The consent screen for this app's OAuth authorization server.
//
// Reached only through `/oauth2/authorize`, which redirects here with the
// pending authorization in the query string once it has a signed-in session.
// In practice the client is an MCP client asking to act as the person reading
// this page — on the app MCP (`/api/mcp`) or the 007 workflow MCP (`wf:*`).
//
// The whole query string goes back to `/oauth2/consent` as `oauth_query`
// rather than being picked apart here: the authorization request is the
// server's to interpret, and re-deriving it field by field in the browser
// would be a second, worse parser of a security-relevant payload. This page
// decides exactly one thing — yes or no.

/**
 * What each scope actually lets the holder do, in the terms someone approving
 * it would use.
 *
 * A scope string is a protocol token, not a sentence. Showing `wf:write` and
 * expecting an informed decision is how consent screens become a reflex, so
 * the consequence is spelled out and the dangerous one says what it can break.
 */
const SCOPE_COPY: Record<string, { title: string; detail: string }> = {
  'wf:read': {
    title: 'Read your workflow console',
    detail:
      'Agents, workflows, run traces with their prompts and tool calls, feedback and eval results — everything the console shows you.',
  },
  'wf:write': {
    title: 'Author workflows and evals',
    detail:
      'Edit drafts, write eval Samples, and publish workflow versions. Publishing changes what customers get.',
  },
  // TODO: copy for the app scope (APP_MCP_SCOPE in lib/mcp-resources.ts).
  app: {
    title: `Use ${PRODUCT_NAME} as you`,
    detail: 'Read and change anything your account can.',
  },
  openid: {
    title: 'Confirm who you are',
    detail: 'Your user id, so its edits are recorded against your account.',
  },
  profile: { title: 'See your name', detail: 'Your display name.' },
  email: { title: 'See your email address', detail: 'Your email address.' },
  offline_access: {
    title: 'Stay signed in',
    detail:
      'Refresh its own access without sending you back here every time it expires.',
  },
}

/** A scope nobody wrote copy for — shown rather than hidden. */
function describeScope(scope: string) {
  return (
    SCOPE_COPY[scope] ?? {
      title: scope,
      detail: 'Requested by the application.',
    }
  )
}

export function OAuthConsent() {
  const params = useSearchParams()
  const clientId = params.get('client_id')
  const scopes = (params.get('scope') ?? '').split(/\s+/).filter(Boolean)

  const [pending, setPending] = useState<'accept' | 'deny' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(accept: boolean) {
    setPending(accept ? 'accept' : 'deny')
    setError(null)
    try {
      // The endpoint answers `{ redirect: true, url }` on BOTH paths — an
      // accept carries the authorization code, a deny carries
      // `error=access_denied`. Its OpenAPI metadata advertises `redirect_uri`
      // instead, which the implementation does not return; reading that name
      // is why the first working build died on "No redirect returned" with the
      // consent already recorded. `redirect_uri` stays as a fallback in case
      // they reconcile the two, and `url` is what actually arrives today.
      const res = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accept,
          // The server reads the pending authorization back out of this.
          oauth_query: window.location.search,
        }),
      })
      if (!res.ok) throw new Error('Could not complete the authorization.')
      const body = await res.json<{ url?: string; redirect_uri?: string }>()
      const target = body.url ?? body.redirect_uri
      if (!target) throw new Error('No redirect returned')
      // A full navigation, not the router: the destination is the client's
      // own callback (a loopback URL for a local MCP client), which is outside
      // this app entirely.
      window.location.href = target
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not complete the authorization.',
      )
      setPending(null)
    }
  }

  // An authorize redirect always carries a client id. Landing here without one
  // means someone opened the URL directly, and there is nothing to approve.
  if (!clientId) {
    return (
      <div className="bg-white w-full max-w-md rounded-xl border p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Nothing to approve</h1>
        <p className="text-gray-500 mt-2 text-sm">
          This page is the last step of an application sign-in. Start from the
          application you were connecting.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white w-full max-w-md rounded-xl border p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 flex size-10 items-center justify-center rounded-full">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Authorize application</h1>
          <p className="text-gray-500 text-sm">
            An application is asking to act as you in {PRODUCT_NAME}.
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {scopes.map((scope) => {
          const { title, detail } = describeScope(scope)
          return (
            <li key={scope} className="flex gap-2.5">
              <Check
                className="text-gray-500 mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-gray-500 text-xs">{detail}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-red-600 mt-4 text-sm">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 bg-gray-900 text-white hover:bg-gray-800"
          disabled={pending !== null}
          onClick={() => void decide(true)}
        >
          {pending === 'accept' ? 'Authorizing…' : 'Allow'}
        </button>
        <button
          type="button"
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1 border border-gray-300 hover:bg-gray-50"
          disabled={pending !== null}
          onClick={() => void decide(false)}
        >
          <X className="size-4" aria-hidden />
          {pending === 'deny' ? 'Cancelling…' : 'Deny'}
        </button>
      </div>
    </div>
  )
}
