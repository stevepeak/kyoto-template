'use client'

import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'

/** The subset of Cloudflare's `window.turnstile` API this widget uses. */
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
      appearance?: 'always' | 'execute' | 'interaction-only'
    },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// One script load per page, shared by every widget.
let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile script loaded without an API'))
    }
    script.onerror = () => {
      // Let a later mount retry rather than caching the failure.
      scriptPromise = null
      reject(new Error('Failed to load Turnstile'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export interface TurnstileHandle {
  /**
   * Fetch a fresh token. A token is single-use — call this after every
   * submit, successful or not, or the next submit is rejected.
   */
  reset: () => void
}

interface TurnstileProps {
  siteKey: string
  /** The current token, or null once it expires / errors / is reset. */
  onToken: (token: string | null) => void
  ref?: Ref<TurnstileHandle>
}

/**
 * Cloudflare Turnstile bot check. Better Auth's `captcha()` plugin verifies the
 * token server-side; send it with {@link captchaFetchOptions}.
 *
 * `interaction-only`: invisible unless Cloudflare decides to challenge.
 */
export function Turnstile({ siteKey, onToken, ref }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // Callbacks are captured once at render time by Turnstile; read the latest
  // through a ref so a re-rendered parent's `onToken` is the one called.
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  })

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    let cancelled = false
    void loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch((error: unknown) => {
        console.error('[turnstile]', error)
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [siteKey])

  return <div ref={containerRef} />
}

/**
 * The `fetchOptions` that carry a Turnstile token to Better Auth, or nothing
 * when Turnstile is off.
 */
export function captchaFetchOptions(token: string | null) {
  return token
    ? { fetchOptions: { headers: { 'x-captcha-response': token } } }
    : {}
}
