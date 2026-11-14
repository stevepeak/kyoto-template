import { Button, Link, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

import { color, fontFamily } from '../theme'

/** The card's headline. */
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: color.ink,
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '28px',
        margin: '0 0 12px',
      }}
    >
      {children}
    </Text>
  )
}

/** Body paragraph. */
export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: color.inkMuted,
        fontSize: '15px',
        lineHeight: '24px',
        margin: '0 0 16px',
      }}
    >
      {children}
    </Text>
  )
}

/**
 * A call-to-action button followed by the same URL as selectable text.
 *
 * Clients that strip button styling leave a bare word, so the link has to
 * exist somewhere a reader can copy it. `wordBreak` stops a long tokenised URL
 * from pushing the card wider than the viewport in Gmail.
 */
export function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Section style={{ margin: '8px 0 20px' }}>
        <Button
          href={href}
          style={{
            backgroundColor: color.brandFg,
            borderRadius: '6px',
            color: '#ffffff',
            display: 'inline-block',
            fontFamily,
            fontSize: '14px',
            fontWeight: 600,
            padding: '11px 18px',
            textDecoration: 'none',
          }}
        >
          {label}
        </Button>
      </Section>
      <Text
        style={{
          color: color.inkMuted,
          fontSize: '13px',
          lineHeight: '20px',
          margin: '0 0 6px',
        }}
      >
        Or paste this link into your browser:
      </Text>
      <Link
        href={href}
        style={{
          color: color.brandFg,
          fontFamily,
          fontSize: '13px',
          lineHeight: '20px',
          overflowWrap: 'anywhere',
          textDecoration: 'underline',
          wordBreak: 'break-all',
        }}
      >
        {href}
      </Link>
    </>
  )
}
