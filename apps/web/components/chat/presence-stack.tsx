import type { ChatUser } from '@app/workflows-client'

import { ChatAvatar } from './chat-avatar'

const MAX_SHOWN = 4

/** Overlapping avatars of everyone with the room open. */
export function PresenceStack({ viewers }: { viewers: ChatUser[] }) {
  if (viewers.length === 0) return null
  const extra = viewers.length - MAX_SHOWN
  return (
    <div
      className="flex items-center"
      title={viewers.map((v) => v.name).join(', ')}
      aria-label={`${viewers.length} viewing`}
    >
      <div className="flex -space-x-2">
        {viewers.slice(0, MAX_SHOWN).map((v) => (
          <span key={v.id} className="relative">
            <ChatAvatar user={v} size="sm" className="ring-2 ring-background" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span>
      )}
    </div>
  )
}
