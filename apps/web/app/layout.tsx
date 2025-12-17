import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import './globals.css'
import { PostHogProvider } from './providers/posthog-provider'
import { TRPCProvider } from './providers/trpc-provider'

export const metadata: Metadata = {
  title: 'Hello World',
  description: 'A simple Next.js app',
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
