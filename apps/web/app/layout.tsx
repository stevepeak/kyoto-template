import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import './globals.css'
import { PostHogProvider } from './providers/posthog-provider'

export const metadata: Metadata = {
  title: 'Hello World',
  description: 'A simple Next.js app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
