import { describe, expect, test } from 'bun:test'

import { checkHealth } from './health'

describe('checkHealth', () => {
  test('ok when every probe passes', async () => {
    const report = await checkHealth({
      a: () => Promise.resolve(),
      b: () => Promise.resolve(),
    })
    expect(report.status).toBe('ok')
    expect(report.checks.a?.ok).toBe(true)
  })

  test('degraded when one probe throws, without leaking the error', async () => {
    const report = await checkHealth({
      a: () => Promise.resolve(),
      b: () => Promise.reject(new Error('secret connection string')),
    })
    expect(report.status).toBe('degraded')
    expect(report.checks.b?.ok).toBe(false)
    expect(Object.keys(report.checks.b ?? {})).toEqual(['ok', 'ms'])
    expect(JSON.stringify(report)).not.toContain('secret')
  })
})
