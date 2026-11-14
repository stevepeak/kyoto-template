'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { ChatPanel } from './chat-panel'

interface ChatRoomViewProps {
  roomId: string
  name: string
  selfId: string
}

/** One room, full page: a way back to the list, then the live chat. */
export function ChatRoomView({ roomId, name, selfId }: ChatRoomViewProps) {
  return (
    <div className="flex h-full w-full flex-col px-3 py-3 sm:px-6 sm:py-4">
      <Link
        href="/chats"
        className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All chats
      </Link>
      <div className="min-h-0 flex-1">
        <ChatPanel roomId={roomId} selfId={selfId} title={name} />
      </div>
    </div>
  )
}
