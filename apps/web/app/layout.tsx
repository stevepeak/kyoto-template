import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/lib/brand'
import { configuredAppUrl } from '@/lib/mcp-resources'

import { PostHogProvider } from './providers/posthog-provider'
import { ReactGrab } from './providers/react-grab'
import { ThemeProvider } from './providers/theme-provider'
import { TRPCProvider } from './providers/trpc-provider'

export const metadata: Metadata = {
  // Makes the og:image (app/opengraph-image.tsx) and canonical URLs absolute.
  // APP_URL is passed to the build in CI.
  metadataBase: new URL(configuredAppUrl() ?? 'http://localhost:3000'),
  title: {
    template: `%s | ${PRODUCT_NAME}`,
    default: PRODUCT_NAME,
  },
  description: PRODUCT_DESCRIPTION,
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    siteName: PRODUCT_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ReactGrab />
        <ThemeProvider>
          <TRPCProvider>
            <PostHogProvider>{children}</PostHogProvider>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
