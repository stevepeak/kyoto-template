import { describe, expect, test } from 'bun:test'

import { contentSecurityPolicy, securityHeaders } from './security-headers'

const base = {
  workflowsUrl: 'https://wf.example.com',
  posthogHost: 'https://us.i.posthog.com',
}

function directive(csp: string, name: string): string[] {
  const found = csp.split('; ').find((d) => d.startsWith(`${name} `))
  return found ? found.split(' ').slice(1) : []
}

describe('contentSecurityPolicy', () => {
  test('lets the browser reach the workflows worker over HTTP and WebSocket', () => {
    const connect = directive(
      contentSecurityPolicy({ ...base, dev: false }),
      'connect-src',
    )
    expect(connect).toContain('https://wf.example.com')
    expect(connect).toContain('wss://wf.example.com')
  })

  test('allows PostHog and its asset host', () => {
    const script = directive(
      contentSecurityPolicy({ ...base, dev: false }),
      'script-src',
    )
    expect(script).toContain('https://us.i.posthog.com')
    expect(script).toContain('https://us-assets.i.posthog.com')
  })

  test('allows Turnstile to load and frame its challenge', () => {
    const csp = contentSecurityPolicy({ ...base, dev: false })
    expect(directive(csp, 'script-src')).toContain(
      'https://challenges.cloudflare.com',
    )
    expect(directive(csp, 'frame-src')).toEqual([
      'https://challenges.cloudflare.com',
    ])
  })

  test('forbids framing and only relaxes eval in dev', () => {
    const prod = contentSecurityPolicy({ ...base, dev: false })
    const dev = contentSecurityPolicy({ ...base, dev: true })
    expect(directive(prod, 'frame-ancestors')).toEqual(["'none'"])
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'")
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(prod).toContain('upgrade-insecure-requests')
    expect(dev).not.toContain('upgrade-insecure-requests')
  })

  test('skips PostHog when no host is configured', () => {
    const script = directive(
      contentSecurityPolicy({ workflowsUrl: base.workflowsUrl, dev: false }),
      'script-src',
    )
    expect(script.some((s) => s.includes('posthog'))).toBe(false)
  })
})

describe('securityHeaders', () => {
  test('sends HSTS only outside dev', () => {
    const keys = (dev: boolean) => {
      return securityHeaders({ ...base, dev }).map((h) => h.key)
    }
    expect(keys(false)).toContain('Strict-Transport-Security')
    expect(keys(true)).not.toContain('Strict-Transport-Security')
  })
})
