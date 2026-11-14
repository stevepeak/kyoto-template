import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

import { FOOTER_TEXT, PRODUCT_DOMAIN, PRODUCT_NAME } from '../brand'
import { color, fontFamily } from '../theme'

export interface EmailLayoutProps {
  /**
   * The inbox preview line — the grey text a client shows after the subject.
   *
   * Required rather than optional: left unset, clients fall back to scraping
   * the first words of the body. Every template has to make a deliberate
   * choice here.
   */
  preview: string
  /** Card width in px. 520 suits a short message built around one link. */
  maxWidth?: number
  /**
   * One-click unsubscribe link for an optional category (product updates,
   * tips). Leave unset on security/account mail, which can't be turned off.
   * The sender also puts it in the `List-Unsubscribe` header.
   */
  unsubscribeUrl?: string
  children: ReactNode
}

/**
 * The shell every transactional email renders inside: white card on a tinted
 * canvas, wordmark above, footer below.
 *
 * This file sits in `components/`, not `templates/`, because `email dev`
 * treats every file under its `--dir` as a previewable email. A shell with no
 * content is not one.
 */
export function EmailLayout({
  preview,
  maxWidth = 520,
  unsubscribeUrl,
  children,
}: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: color.canvas,
          fontFamily,
          margin: 0,
          padding: '32px 12px',
        }}
      >
        {/* The preheader, hand-written instead of react-email's `<Preview>`.
            That component pads the line out with ~150 runs of zero-width
            characters (U+200B–U+200F, U+FEFF) so no body text trails it in the
            inbox list. Hidden zero-width text is a known phishing-evasion
            trick, and Microsoft 365 scores it — mail can land in Junk for it.
            A little body text showing after the preview is the cheaper price.
            `data-skip-in-text` keeps it out of the plain-text part, the same
            as `<Preview>` did. */}
        <div
          data-skip-in-text="true"
          style={{
            display: 'none',
            lineHeight: '1px',
            maxHeight: 0,
            maxWidth: 0,
            opacity: 0,
            overflow: 'hidden',
          }}
        >
          {preview}
        </div>
        <Container style={{ margin: '0 auto', maxWidth: `${maxWidth}px` }}>
          {/* Text wordmark — Gmail and Outlook do not render SVG logos. */}
          <Text
            style={{
              color: color.brandFg,
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: '24px',
              margin: '0 0 16px',
            }}
          >
            {PRODUCT_NAME}
          </Text>

          <Section
            style={{
              backgroundColor: color.surface,
              border: `1px solid ${color.edge}`,
              borderRadius: '10px',
              padding: '32px',
            }}
          >
            {children}
          </Section>

          <Hr
            style={{
              border: 'none',
              borderTop: `1px solid ${color.edge}`,
              margin: '24px 0 16px',
            }}
          />
          <Text
            style={{
              color: color.inkMuted,
              fontSize: '12px',
              lineHeight: '18px',
              margin: 0,
            }}
          >
            {PRODUCT_NAME} · {PRODUCT_DOMAIN}
          </Text>
          <Text
            style={{
              color: color.inkMuted,
              fontSize: '12px',
              lineHeight: '18px',
              margin: '4px 0 0',
            }}
          >
            {FOOTER_TEXT}
          </Text>
          {unsubscribeUrl ? (
            <Text
              style={{
                color: color.inkMuted,
                fontSize: '12px',
                lineHeight: '18px',
                margin: '4px 0 0',
              }}
            >
              Don’t want these emails?{' '}
              <Link
                href={unsubscribeUrl}
                style={{ color: color.inkMuted, textDecoration: 'underline' }}
              >
                Unsubscribe
              </Link>
              .
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}
