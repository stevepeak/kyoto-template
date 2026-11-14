'use client'

import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'

import { ChatWidget } from '@/components/chat/chat-widget'
import { CommandPalette, ShortcutHint } from '@/components/command-palette'
import { SiteFooter } from '@/components/site-footer'
import { authClient } from '@/lib/auth-client'
import { PRODUCT_NAME } from '@/lib/brand'

import { AccountMenu, type AccountUser } from './account-menu'
import { ImpersonationBanner } from './impersonation-banner'
import {
  ADMIN_NAV_ITEMS,
  NAV_ITEMS,
  type NavItem,
  SIDEBAR_COLLAPSED_COOKIE,
} from './nav'

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

type SetupProgress = { done: number; total: number }

/** A small ring that fills as setup items get done. */
function ProgressCircle({ done, total }: SetupProgress) {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  const fraction = total === 0 ? 1 : done / total
  return (
    <span
      className="ml-auto flex items-center gap-1 text-xs text-gray-400"
      title={`${done} of ${total} done`}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          strokeWidth="2"
          className="stroke-gray-200"
        />
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={fraction === 1 ? 'stroke-green-500' : 'stroke-gray-900'}
        />
      </svg>
      <span className="sr-only">
        {done} of {total} done
      </span>
    </span>
  )
}

function NavLink({
  item: { href, label, icon: Icon },
  active,
  onNavigate,
  trailing,
  collapsed,
}: {
  item: NavItem
  active: boolean
  onNavigate: () => void
  trailing?: ReactNode
  /** Icon-only, with the label as a tooltip. */
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-gray-100 font-medium text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
      {!collapsed && trailing}
    </Link>
  )
}

interface AppShellProps {
  children: ReactNode
  /** The server-read session user, used until the client session resolves. */
  initialUser: AccountUser | null
  /** Show the admin section (emails, 007 console, setup) in the sidebar nav. */
  isAdmin: boolean
  /** Setup checklist progress, shown on the Setup nav item (admins only). */
  setupProgress: SetupProgress | null
  /** An admin is signed in as `initialUser` — show the way back. */
  isImpersonating: boolean
  /** The desktop sidebar's collapsed state, read from its cookie. */
  initialCollapsed: boolean
}

export function AppShell({
  children,
  initialUser,
  isAdmin,
  setupProgress,
  isImpersonating,
  initialCollapsed,
}: AppShellProps) {
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Desktop only — the mobile drawer always shows labels.
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  const renderSidebar = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-14 items-center ${
          isCollapsed ? 'justify-center' : 'justify-between px-4'
        }`}
      >
        {!isCollapsed && (
          <Link href="/" className="text-sm font-semibold text-gray-900">
            {PRODUCT_NAME}
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden rounded-md p-1 text-gray-500 hover:bg-gray-100 md:block"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false)
            setPaletteOpen(true)
          }}
          aria-label={isCollapsed ? 'Search' : undefined}
          title={isCollapsed ? 'Search' : undefined}
          className={`flex w-full items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <ShortcutHint />
            </>
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={() => setMobileOpen(false)}
            collapsed={isCollapsed}
          />
        ))}
        {isAdmin && (
          <div className="mt-3 flex flex-col gap-0.5 rounded-md border border-dotted border-gray-300 p-1">
            {!isCollapsed && (
              <span className="px-2 py-1 text-xs font-medium text-gray-400">
                Admin
              </span>
            )}
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onNavigate={() => setMobileOpen(false)}
                collapsed={isCollapsed}
                trailing={
                  item.href === '/setup' && setupProgress ? (
                    <ProgressCircle {...setupProgress} />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200 p-2">
        <AccountMenu user={user} collapsed={isCollapsed} />
      </div>
    </div>
  )

  return (
    <div className="flex h-screen">
      <aside
        className={`hidden shrink-0 border-r border-gray-200 bg-white md:block ${
          collapsed ? 'w-14' : 'w-60'
        }`}
      >
        {renderSidebar(collapsed)}
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
            {renderSidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isImpersonating && <ImpersonationBanner email={user.email} />}
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

      <ChatWidget />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        isAdmin={isAdmin}
      />
    </div>
  )
}
