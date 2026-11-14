'use client'

import { MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { EmptyState, LoadingState } from '@/components/states'
import { trpc } from '@/lib/trpc'

function formatActivity(ms: number): string {
  const date = new Date(ms)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Every chat room; click a row to open it. */
export function ChatRoomsTable() {
  const router = useRouter()
  const rooms = trpc.chat.rooms.useQuery()

  if (rooms.isLoading) return <LoadingState variant="block" />
  if (!rooms.data || rooms.data.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No chats yet"
        description="Start one above — the assistant and anyone who opens it can join in."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th scope="col" className="px-4 py-3 font-medium">
              Chat
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Last message
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Messages
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Last activity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rooms.data.map((room) => (
            <tr
              key={room.id}
              onClick={() => router.push(`/chats/${room.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <td className="px-4 py-3.5 whitespace-nowrap">
                <Link
                  href={`/chats/${room.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {room.name}
                </Link>
              </td>
              <td className="max-w-md truncate px-4 py-3.5 text-muted-foreground">
                {room.lastMessage ? (
                  <>
                    <span className="text-foreground">
                      {room.lastMessage.authorName}:
                    </span>{' '}
                    {room.lastMessage.body}
                  </>
                ) : (
                  'No messages yet'
                )}
              </td>
              <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                {room.messageCount}
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap text-muted-foreground">
                {formatActivity(room.lastActivityAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
