import {
  House,
  ListChecks,
  type LucideIcon,
  Mail,
  MessagesSquare,
  Workflow,
} from 'lucide-react'

/** Remembers the desktop sidebar's collapsed state; read by the app layout. */
export const SIDEBAR_COLLAPSED_COOKIE = 'sidebar-collapsed'

export type NavItem = { href: string; label: string; icon: LucideIcon }

// TODO: the app's primary navigation.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/chats', label: 'Chats', icon: MessagesSquare },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/workflows', label: '007 Workflows', icon: Workflow },
  { href: '/setup', label: 'Setup', icon: ListChecks },
]
