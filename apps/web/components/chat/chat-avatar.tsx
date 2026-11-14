import type { ChatUser } from '@app/workflows-client'
import { Sparkles } from 'lucide-react'

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
} as const

interface ChatAvatarProps {
  /** `null` renders the assistant. */
  user: ChatUser | null
  size?: keyof typeof SIZES
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]
  return letters.toUpperCase()
}

export function ChatAvatar({
  user,
  size = 'md',
  className = '',
}: ChatAvatarProps) {
  const base = `${SIZES[size]} shrink-0 rounded-full ${className}`
  if (!user) {
    return (
      <span
        className={`${base} flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white`}
        title="Assistant"
      >
        <Sparkles className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    )
  }
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        title={user.name}
        className={`${base} object-cover`}
      />
    )
  }
  return (
    <span
      className={`${base} flex items-center justify-center bg-primary font-medium text-primary-foreground`}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  )
}
