/**
 * Email-safe colours.
 *
 * Literal hex rather than CSS custom properties because email clients do not
 * resolve `var(--…)` — Outlook and Gmail's web client both drop them. Light
 * values only: email has no reliable dark-mode switch, and the clients that
 * fake one invert the whole message anyway.
 *
 * TODO: replace with the product's brand palette.
 */
export const color = {
  /** The area around the card. */
  canvas: '#f5f6f8',
  /** The card itself. */
  surface: '#ffffff',
  /** Hairline borders. */
  edge: '#e3e6eb',
  /** Body copy. */
  ink: '#14161a',
  /** Secondary copy, footer. */
  inkMuted: '#5b6472',
  /** Wordmark, buttons, links. */
  brandFg: '#111827',
} as const

/**
 * One stack, used everywhere. No webfont: `@font-face` is stripped by Outlook
 * and by most Gmail clients, so the system stack is the consistent choice.
 */
export const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
