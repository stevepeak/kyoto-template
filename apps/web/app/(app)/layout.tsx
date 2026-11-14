import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell/app-shell'
import { SIDEBAR_COLLAPSED_COOKIE } from '@/components/app-shell/nav'
import { getAuth } from '@/lib/auth'
import { getSetupChecklist } from '@/lib/setup-checklist'
import { canUseWorkflows } from '@/lib/wf-access'

// Reads the session (and the 007 allowlist binding) per request.
export const dynamic = 'force-dynamic'

/**
 * The signed-in app: sidebar + main pane. The server read seeds the sidebar
 * so it doesn't flash in; the client session takes over after hydration.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null
  const isAdmin = canUseWorkflows(user?.email)
  const checklist = isAdmin ? getSetupChecklist() : []
  const cookieStore = await cookies()
  const initialCollapsed =
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === 'true'

  return (
    <AppShell
      initialUser={user}
      isAdmin={isAdmin}
      setupProgress={
        isAdmin
          ? {
              done: checklist.filter((item) => item.done).length,
              total: checklist.length,
            }
          : null
      }
      isImpersonating={Boolean(session?.session.impersonatedBy)}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </AppShell>
  )
}
