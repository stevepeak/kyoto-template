import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PostHogProvider } from './providers/posthog-provider'
import { ReactGrab } from './providers/react-grab'
import { TRPCProvider } from './providers/trpc-provider'

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Co',
    default: 'Acme Co',
  },
  description: 'A modern Next.js application template',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'Acme Co',
    description: 'A modern Next.js application template',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactGrab />
        <TRPCProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
