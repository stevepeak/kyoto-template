import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { AdminUsers } from '@/components/admin/admin-users'
import { getAuth } from '@/lib/auth'
import { canUseWorkflows } from '@/lib/wf-access'

export const metadata: Metadata = { title: 'Admin' }

/** Users: ban, unban, and sign in as them. */
export default async function AdminPage() {
  // The proxy only checks for a cookie; this is the real check. The admin
  // endpoints enforce the same allowlist on their own (`getAuth` hooks).
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect('/login?redirectTo=/admin')
  if (!canUseWorkflows(session.user.email)) notFound()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Admin
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Everyone with an account. Banning signs them out everywhere.
        </p>
      </header>
      <AdminUsers currentUserId={session.user.id} />
    </main>
  )
}
