import { cfVar, cfWaitUntil } from './cf-env'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

/**
 * PostHog events sent from the server, for moments no browser sees — an
 * assistant calling the MCP endpoint never loads a page.
 *
 * A plain `fetch` to PostHog's capture endpoint rather than `@app/posthog`
 * (`posthog-node`): one event per request, sent after the response, is all
 * this needs, and the SDK's batching queue would have to be flushed by hand on
 * Workers anyway.
 *
 * Anonymous on purpose: no consent banner reaches an assistant's call, so each
 * event gets a throwaway id and no person profile.
 *
 * Typed so the names and properties are a contract with whoever builds the
 * insight.
 */
interface ServerEvents {
  /** An assistant called an app MCP tool, and said why. */
  mcp_tool_called: {
    tool: string
    intent: string
    /** The OAuth client — which assistant made the call. */
    clientId: string
    ok: boolean
    durationMs: number
  }
}

/**
 * Record one event, without making the response wait for it.
 *
 * Silent when PostHog isn't configured, and never throws: analytics must not
 * be able to fail the request it describes.
 */
export function captureServerEvent<K extends keyof ServerEvents>(args: {
  name: K
  props: ServerEvents[K]
}): void {
  const apiKey = cfVar('POSTHOG_API_KEY')
  // Local env files may hold the production key, so `next dev` must not send.

  if (!apiKey || process.env.NODE_ENV === 'development') return
  const host = (cfVar('POSTHOG_HOST') ?? DEFAULT_POSTHOG_HOST).replace(
    /\/+$/,
    '',
  )

  const send = async () => {
    try {
      const res = await fetch(`${host}/i/v0/e/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          event: args.name,
          distinct_id: crypto.randomUUID(),
          properties: { ...args.props, $process_person_profile: false },
          timestamp: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        console.error('[analytics] capture rejected', args.name, res.status)
      }
    } catch (err) {
      console.error('[analytics] capture failed', args.name, err)
    }
  }
  cfWaitUntil(send())
}
