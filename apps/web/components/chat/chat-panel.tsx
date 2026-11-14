'use client'

import { MessageCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { LoadingState } from '@/components/states'

import { ChatComposer } from './chat-composer'
import { ChatMessageItem } from './chat-message-item'
import { PresenceStack } from './presence-stack'
import { TypingIndicator } from './typing-indicator'
import { useChatRoom } from './use-chat-room'

interface ChatPanelProps {
  roomId: string
  selfId: string
  /** Header title; the room's name on its own page. */
  title?: string
  /** Show a close button (the floating widget). */
  onClose?: () => void
}

/** The open chat: header with presence, message list, typing, composer. */
export function ChatPanel({
  roomId,
  selfId,
  title = 'Chat',
  onClose,
}: ChatPanelProps) {
  const room = useChatRoom({ roomId, selfId })
  const scrollRef = useRef<HTMLDivElement>(null)

  const lastId = room.messages.at(-1)?.id
  const isSomeoneTyping = room.typing.length > 0 || room.isAssistantThinking
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [lastId, isSomeoneTyping])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            {title}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                room.connection === 'open' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {room.connection === 'open'
              ? `${room.viewers.length} here`
              : room.connection === 'connecting'
                ? 'Connecting…'
                : 'Reconnecting…'}
          </span>
        </div>
        <PresenceStack viewers={room.viewers} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {room.isLoadingHistory ? (
          <LoadingState variant="block" />
        ) : room.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">
              Say hello — the assistant and anyone here will see it.
            </p>
          </div>
        ) : (
          room.messages.map((message, i) => {
            const prev = room.messages[i - 1]
            const isContinuation =
              prev != null &&
              prev.role === message.role &&
              prev.author?.id === message.author?.id &&
              message.createdAt - prev.createdAt < 5 * 60 * 1000
            return (
              <ChatMessageItem
                key={message.id}
                message={message}
                isOwn={message.author?.id === selfId}
                isContinuation={isContinuation}
              />
            )
          })
        )}
      </div>

      <TypingIndicator
        users={room.typing}
        isAssistantThinking={room.isAssistantThinking}
      />
      <ChatComposer onSend={room.send} onTyping={room.notifyTyping} />
    </div>
  )
}
