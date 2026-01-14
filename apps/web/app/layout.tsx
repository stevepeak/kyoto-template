import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import './globals.css'
import { PostHogProvider } from './providers/posthog-provider'
import { TRPCProvider } from './providers/trpc-provider'

export const metadata: Metadata = {
  title: {
    template: '%s | Kyoto',
    default: 'Kyoto',
  },
  description: 'A modern Next.js application template',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'Kyoto',
    description: 'A modern Next.js application template',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
