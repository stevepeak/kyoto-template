import { ImageResponse } from 'next/og'

import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/lib/brand'

// The link-preview card (Slack, iMessage, social). Rendered once at build
// and served as a static PNG; nested routes inherit it unless they add
// their own `opengraph-image`.
// TODO: replace with your brand's design (logo, colours, tagline).

export const alt = PRODUCT_NAME
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 96,
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        color: 'white',
      }}
    >
      <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
        {PRODUCT_NAME}
      </div>
      <div style={{ marginTop: 24, fontSize: 36, color: '#9ca3af' }}>
        {PRODUCT_DESCRIPTION}
      </div>
    </div>,
    size,
  )
}
