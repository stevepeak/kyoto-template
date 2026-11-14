import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site-footer'

import { PostHogProvider } from './providers/posthog-provider'
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
        <TRPCProvider>
          <PostHogProvider>
            {children}
            <SiteFooter />
          </PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
