import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { ChatRoomView } from '@/components/chat/chat-room-view'
import { getAuth } from '@/lib/auth'
import { getChatRoom } from '@/lib/chat'
import { getDb } from '@/lib/db'

export const metadata: Metadata = { title: 'Chat' }

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const db = getDb()
  const session = await getAuth(db).api.getSession({
    headers: await headers(),
  })
  if (!session) redirect(`/login?redirectTo=/chats/${roomId}`)

  const room = await getChatRoom({ db, roomId })
  if (!room) notFound()

  return (
    <ChatRoomView roomId={room.id} name={room.name} selfId={session.user.id} />
  )
}
