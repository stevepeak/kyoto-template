'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc'

/** Name a new room and jump straight into it. */
export function NewChatForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const createRoom = trpc.chat.createRoom.useMutation({
    onSuccess: ({ id }) => router.push(`/chats/${id}`),
    onError: () => toast.error('Could not create the chat — try again.'),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed) createRoom.mutate({ name: trimmed })
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2 sm:w-auto">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New chat name"
        aria-label="New chat name"
        maxLength={80}
        className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 sm:w-56"
      />
      <button
        type="submit"
        disabled={!name.trim() || createRoom.isPending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New chat
      </button>
    </form>
  )
}
