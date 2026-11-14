'use client'

import { Command } from 'cmdk'
import {
  type LucideIcon,
  LogOut,
  Monitor,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

import { ADMIN_NAV_ITEMS, NAV_ITEMS } from '@/components/app-shell/nav'
import { SETTINGS_GROUPS } from '@/components/settings/settings-nav'
import { authClient } from '@/lib/auth-client'

export const THEME_OPTIONS: {
  value: string
  label: string
  icon: LucideIcon
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const noopSubscribe = () => () => {}

/** `⌘K` on Apple platforms, `Ctrl K` elsewhere (`⌘K` during SSR). */
export function ShortcutHint() {
  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  )
  return (
    <kbd className="rounded border border-gray-200 px-1.5 font-sans text-[0.6875rem] text-gray-400">
      {isMac ? '⌘K' : 'Ctrl K'}
    </kbd>
  )
}

const groupClass =
  'px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase'

const itemClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-900'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Include the admin pages (007 console, setup). */
  isAdmin: boolean
}

/** The ⌘K / Ctrl+K palette: jump to a page, switch theme, sign out. */
export function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
}: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  const signOut = async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const pages = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 frosted-backdrop"
      contentClassName="fixed top-[15vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-3">
        <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <Command.Input
          placeholder="Type a command or search…"
          className="h-11 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <Command.List className="max-h-80 overflow-y-auto py-1">
        <Command.Empty className="px-3 py-6 text-center text-sm text-gray-500">
          No results.
        </Command.Empty>

        <Command.Group heading="Pages" className={groupClass}>
          {pages.map(({ href, label, icon: Icon }) => (
            <Command.Item
              key={href}
              value={`page ${label}`}
              onSelect={() => run(() => router.push(href))}
              className={itemClass}
            >
              <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
              {label}
            </Command.Item>
          ))}
        </Command.Group>

        {SETTINGS_GROUPS.map((group) => (
          <Command.Group
            key={group.label}
            heading={`Settings · ${group.label}`}
            className={groupClass}
          >
            {group.tabs.map(({ href, label, icon: Icon }) => (
              <Command.Item
                key={href}
                value={`settings ${label}`}
                onSelect={() => run(() => router.push(href))}
                className={itemClass}
              >
                <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}

        <Command.Group heading="Theme" className={groupClass}>
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Command.Item
              key={value}
              value={`theme ${label}`}
              keywords={['appearance', 'mode', value === 'dark' ? 'night' : '']}
              onSelect={() => run(() => setTheme(value))}
              className={itemClass}
            >
              <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
              {label} theme
              {theme === value && (
                <span className="ml-auto text-xs text-gray-400">Current</span>
              )}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Account" className={groupClass}>
          <Command.Item
            value="sign out log out"
            onSelect={() => run(signOut)}
            className={itemClass}
          >
            <LogOut className="h-4 w-4 text-gray-500" aria-hidden="true" />
            Sign out
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
