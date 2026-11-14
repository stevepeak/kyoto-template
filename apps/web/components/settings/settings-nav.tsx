'use client'

import {
  Bell,
  KeySquare,
  type LucideIcon,
  Plug,
  Shield,
  UserCircle,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { authClient } from '@/lib/auth-client'

type SettingsTab = { href: string; label: string; icon: LucideIcon }

type SettingsGroup = { label: string; tabs: SettingsTab[] }

// Add a group (e.g. "Organization") when the app grows things that belong to
// something other than the signed-in person.
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: 'Account',
    tabs: [
      { href: '/settings', label: 'Profile', icon: UserCircle },
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings/security', label: 'Security', icon: Shield },
      { href: '/settings/api-keys', label: 'API keys', icon: KeySquare },
      { href: '/settings/mcp', label: 'MCP', icon: Plug },
    ],
  },
]

const ALL_HREFS = SETTINGS_GROUPS.flatMap((g) => g.tabs.map((t) => t.href))

/** The most specific matching tab wins — `/settings` prefixes every tab. */
function activeHref(pathname: string): string | null {
  let best: string | null = null
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(`${href}/`)
    if (matches && (!best || href.length > best.length)) best = href
  }
  return best
}

interface SettingsNavProps {
  /** The server-read avatar, used until the client session resolves. */
  initialImage: string | null
}

export function SettingsNav({ initialImage }: SettingsNavProps) {
  const active = activeHref(usePathname())
  const { data: session, isPending } = authClient.useSession()
  const image = isPending ? initialImage : (session?.user.image ?? null)

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-col gap-6 md:w-52 md:shrink-0"
    >
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <h2 className="px-3 text-[0.6875rem] font-semibold tracking-wider text-gray-500 uppercase">
            {group.label}
          </h2>
          <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col">
            {group.tabs.map(({ href, label, icon: Icon }) => {
              const isActive = href === active
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                      isActive
                        ? 'bg-gray-100 font-medium text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {href === '/settings' && image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
