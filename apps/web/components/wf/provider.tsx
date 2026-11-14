'use client'

import { createHttpWfDataClient, WfSdkProvider } from '@stevepeak/007/ui'
import { type ReactNode, useState } from 'react'

/**
 * Wraps the 007 editor/run-viewer in its data-client provider, pointed at
 * `/api/wf`. The SDK renders with its own primitives; to match this app's
 * design system pass `components={{ Button, Badge, Input, Label, Textarea }}`.
 */
export function WfProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    return createHttpWfDataClient({ baseUrl: '/api/wf' })
  })
  return <WfSdkProvider client={client}>{children}</WfSdkProvider>
}
