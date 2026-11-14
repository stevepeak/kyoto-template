'use client'

import { House, type LucideIcon, Mail, Menu, Workflow, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'

import { SiteFooter } from '@/components/site-footer'
import { authClient } from '@/lib/auth-client'
import { PRODUCT_NAME } from '@/lib/brand'

import { AccountMenu, type AccountUser } from './account-menu'

type NavItem = { href: string; label: string; icon: LucideIcon }

// TODO: the app's primary navigation.
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/emails', label: 'Emails', icon: Mail },
]

const WORKFLOWS_NAV_ITEM: NavItem = {
  href: '/workflows',
  label: '007 Workflows',
  icon: Workflow,
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

interface AppShellProps {
  children: ReactNode
  /** The server-read session user, used until the client session resolves. */
  initialUser: AccountUser | null
  /** Show the 007 console entry in the sidebar nav. */
  canUseWorkflows: boolean
}

export function AppShell({
  children,
  initialUser,
  canUseWorkflows,
}: AppShellProps) {
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const user: AccountUser | null = session
    ? {
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : isPending
      ? initialUser
      : null

  // Signed out: no sidebar, just the page.
  if (!user) {
    return (
      <>
        {children}
        <SiteFooter />
      </>
    )
  }

  const navItems = canUseWorkflows
    ? [...NAV_ITEMS, WORKFLOWS_NAV_ITEM]
    : NAV_ITEMS

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold text-gray-900">
          {PRODUCT_NAME}
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                active
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200 p-2">
        <AccountMenu user={user} />
      </div>
    </div>
  )

  return (
    <div className="flex h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white md:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-gray-200 bg-white shadow-lg">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {PRODUCT_NAME}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
