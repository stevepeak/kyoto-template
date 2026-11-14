import type { ChatUser } from '@app/workflows-client'

import { ChatAvatar } from './chat-avatar'

interface TypingIndicatorProps {
  users: ChatUser[]
  isAssistantThinking: boolean
}

function label(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
  return `${names[0]} and ${names.length - 1} others are typing…`
}

/** Bouncing dots for whoever is typing, the assistant included. */
export function TypingIndicator({
  users,
  isAssistantThinking,
}: TypingIndicatorProps) {
  if (users.length === 0 && !isAssistantThinking) return null
  const names = [
    ...(isAssistantThinking ? ['Assistant'] : []),
    ...users.map((u) => u.name),
  ]
  return (
    <div className="flex items-center gap-2 px-4 pb-2" aria-live="polite">
      <div className="flex -space-x-1.5">
        {isAssistantThinking && <ChatAvatar user={null} size="sm" />}
        {users.slice(0, 3).map((u) => (
          <ChatAvatar
            key={u.id}
            user={u}
            size="sm"
            className="ring-2 ring-background"
          />
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="truncate text-xs text-muted-foreground">
        {isAssistantThinking && users.length === 0
          ? 'Assistant is thinking…'
          : label(names)}
      </span>
    </div>
  )
}
