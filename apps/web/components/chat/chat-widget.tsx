'use client'

import { DEFAULT_CHAT_ROOM } from '@app/workflows-client'
import { MessageCircle, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'

import { ChatPanel } from './chat-panel'

/**
 * Floating chat, bottom-right on every signed-in page. Connects to the room
 * only while open, so "viewing" in presence means the panel is open.
 */
export function ChatWidget() {
  const { data: session } = authClient.useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  // The Chats pages are the full-size version of this.
  if (!session || pathname.startsWith('/chats')) return null

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 h-[min(640px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:right-6">
          <ChatPanel
            roomId={DEFAULT_CHAT_ROOM}
            selfId={session.user.id}
            title="Lobby"
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary-hover sm:right-6"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </>
  )
}
