'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'

import { WfProvider } from '@/components/wf/provider'
import { WF_MCP_PATH } from '@/lib/mcp-resources'

const BASE_PATH = '/workflows'

// Client-only: the editor restores tabs from localStorage, which would
// mismatch on hydration.
const WfApp = dynamic(() => import('@stevepeak/007/ui').then((m) => m.WfApp), {
  ssr: false,
})

/** The 007 workflow console — authoring, runs, evals, connectors. */
export default function WorkflowsPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const path =
    pathname.replace(BASE_PATH, '').replace(/^\//, '') +
    (query ? `?${query}` : '')
  return (
    <WfProvider>
      <div className="h-full">
        <WfApp
          basePath={BASE_PATH}
          mcpPath={WF_MCP_PATH}
          path={path}
          // pushState, not router.push — router.push remounts and flickers.
          navigate={(to) => {
            window.history.pushState(
              null,
              '',
              to ? `${BASE_PATH}/${to}` : BASE_PATH,
            )
          }}
        />
      </div>
    </WfProvider>
  )
}
