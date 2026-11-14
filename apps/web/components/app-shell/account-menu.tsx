'use client'

import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { THEME_OPTIONS } from '@/components/command-palette'
import { authClient } from '@/lib/auth-client'
import { PRIVACY_HREF, TERMS_HREF } from '@/lib/legal/links'

export type AccountUser = {
  name: string | null
  email: string
  image: string | null
}

function initials(user: AccountUser): string {
  const source = user.name?.trim() || user.email
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source[0]
  return letters.toUpperCase()
}

function Avatar({ user }: { user: AccountUser }) {
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
      {initials(user)}
    </span>
  )
}

function UserLabel({ user }: { user: AccountUser }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className="truncate text-sm font-medium text-gray-900">
        {user.name || user.email}
      </span>
      {user.name && (
        <span className="truncate text-xs text-gray-500">{user.email}</span>
      )}
    </span>
  )
}

const itemClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900'

/** Light / dark / system switcher shown inside the account popover. */
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1">
      <span className="text-sm text-gray-700">Theme</span>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex rounded-md border border-gray-200 p-0.5"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`rounded p-1 ${
              theme === value
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

interface AccountMenuProps {
  user: AccountUser
}

/** The account button pinned to the bottom of the sidebar, and its popover. */
export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full left-0 z-50 mb-2 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar user={user} />
            <UserLabel user={user} />
          </div>

          <div className="my-1 h-px bg-gray-200" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
          <ThemeSwitcher />

          <div className="my-1 h-px bg-gray-200" />
          <Link
            href={PRIVACY_HREF}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Privacy
          </Link>
          <Link
            href={TERMS_HREF}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Terms
          </Link>

          <div className="my-1 h-px bg-gray-200" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className={itemClass}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-gray-100"
      >
        <Avatar user={user} />
        <UserLabel user={user} />
        <ChevronsUpDown
          className="h-4 w-4 shrink-0 text-gray-400"
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
