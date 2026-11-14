import {
  House,
  ListChecks,
  type LucideIcon,
  Mail,
  Workflow,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

// TODO: the app's primary navigation.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/emails', label: 'Emails', icon: Mail },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/workflows', label: '007 Workflows', icon: Workflow },
  { href: '/setup', label: 'Setup', icon: ListChecks },
]
