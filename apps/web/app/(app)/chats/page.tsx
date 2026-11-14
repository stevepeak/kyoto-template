import type { Metadata } from 'next'

import { ChatRoomsTable } from '@/components/chat/chat-rooms-table'
import { NewChatForm } from '@/components/chat/new-chat-form'

export const metadata: Metadata = { title: 'Chats' }

/** Every chat room — pick one, or start a new one. */
export default function ChatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Chats
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Talk with your team and the AI assistant. Replies are 007 runs you
            can inspect.
          </p>
        </div>
        <NewChatForm />
      </header>
      <ChatRoomsTable />
    </main>
  )
}
