import { describe, expect, test } from 'bun:test'

import { describeUserAgent } from './user-agent'

describe('describeUserAgent', () => {
  test('names browser and platform', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome on macOS')
  })

  test('Edge is not reported as Chrome', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ),
    ).toBe('Edge on Windows')
  })

  test('iPhone Safari is not reported as macOS', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari on iPhone')
  })

  test('falls back to whichever half is known, then null', () => {
    expect(describeUserAgent('curl/8.7.1')).toBeNull()
    expect(describeUserAgent('Something (Linux x86_64)')).toBe('Linux')
    expect(describeUserAgent(null)).toBeNull()
  })
})
