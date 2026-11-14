// Coarse "Chrome on macOS"-style labels from a User-Agent string. Good enough
// to tell a person's devices apart; not a full UA parser.

export function browserFromUserAgent(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return ''
}

export function platformFromUserAgent(ua: string): string {
  // iPhone/iPad before Mac: iPadOS UAs also say "Mac OS X".
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'macOS'
  if (/Win/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return ''
}

/** "Chrome on macOS", or whichever half is known, or null. */
export function describeUserAgent(
  ua: string | null | undefined,
): string | null {
  if (!ua) return null
  const browser = browserFromUserAgent(ua)
  const platform = platformFromUserAgent(ua)
  if (browser && platform) return `${browser} on ${platform}`
  return browser || platform || null
}
