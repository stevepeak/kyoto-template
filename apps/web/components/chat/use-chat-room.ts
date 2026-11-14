'use client'

import {
  type ChatMessage,
  type ChatUser,
  chatServerEventSchema,
} from '@app/workflows-client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { trpc } from '@/lib/trpc'

type ChatConnection = 'connecting' | 'open' | 'reconnecting'

/** How long a "typing" ping keeps someone listed as typing. */
const TYPING_TTL_MS = 3500
/** Minimum gap between our own typing pings. */
const TYPING_THROTTLE_MS = 2000
const PING_INTERVAL_MS = 30_000
const MAX_RETRY_MS = 15_000

interface UseChatRoomResult {
  messages: ChatMessage[]
  isLoadingHistory: boolean
  connection: ChatConnection
  viewers: ChatUser[]
  /** Other people typing right now. */
  typing: ChatUser[]
  isAssistantThinking: boolean
  send: (body: string) => Promise<void>
  notifyTyping: () => void
}

/**
 * One chat room: D1 history from tRPC, plus a WebSocket into the room's
 * ChatRoom Durable Object for presence, typing and new messages. Reconnects
 * with backoff (a fresh token each time) and reloads history on reconnect,
 * so messages sent while offline aren't missed.
 */
export function useChatRoom({
  roomId,
  selfId,
}: {
  roomId: string
  selfId: string
}): UseChatRoomResult {
  const utils = trpc.useUtils()
  const history = trpc.chat.history.useQuery(
    { roomId },
    { refetchOnWindowFocus: false },
  )
  const [live, setLive] = useState<ChatMessage[]>([])
  const [connection, setConnection] = useState<ChatConnection>('connecting')
  const [viewers, setViewers] = useState<ChatUser[]>([])
  const [typingUntil, setTypingUntil] = useState<
    Record<string, { user: ChatUser; until: number }>
  >({})
  const [isAssistantThinking, setIsAssistantThinking] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const socketRef = useRef<WebSocket | null>(null)
  const lastTypingRef = useRef(0)

  const addMessage = useCallback((message: ChatMessage) => {
    setLive((current) =>
      current.some((m) => m.id === message.id)
        ? current
        : [...current, message],
    )
    // Whoever just sent a message has stopped typing.
    if (message.author) {
      const authorId = message.author.id
      setTypingUntil((current) => {
        if (!(authorId in current)) return current
        const { [authorId]: _, ...rest } = current
        return rest
      })
    }
  }, [])

  useEffect(() => {
    let isDisposed = false
    let retryMs = 1000
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let hasConnected = false

    const scheduleReconnect = () => {
      if (isDisposed) return
      setConnection('reconnecting')
      retryTimer = setTimeout(() => void open(), retryMs)
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
    }

    const open = async () => {
      let url: string
      try {
        ;({ url } = await utils.client.chat.connect.mutate({ roomId }))
      } catch {
        scheduleReconnect()
        return
      }
      if (isDisposed) return
      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.onopen = () => {
        retryMs = 1000
        setConnection('open')
        if (hasConnected) void utils.chat.history.invalidate({ roomId })
        hasConnected = true
        pingTimer = setInterval(() => ws.send('ping'), PING_INTERVAL_MS)
      }
      ws.onmessage = (event) => {
        if (typeof event.data !== 'string' || event.data === 'pong') return
        let json: unknown
        try {
          json = JSON.parse(event.data)
        } catch {
          return
        }
        const parsed = chatServerEventSchema.safeParse(json)
        if (!parsed.success) return
        const serverEvent = parsed.data
        switch (serverEvent.type) {
          case 'presence':
            setViewers(serverEvent.viewers)
            break
          case 'typing':
            setTypingUntil((current) => ({
              ...current,
              [serverEvent.user.id]: {
                user: serverEvent.user,
                until: Date.now() + TYPING_TTL_MS,
              },
            }))
            setNow(Date.now())
            break
          case 'message':
            addMessage(serverEvent.message)
            break
          case 'assistant':
            setIsAssistantThinking(serverEvent.isThinking)
            break
        }
      }
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer)
        if (socketRef.current === ws) socketRef.current = null
        scheduleReconnect()
      }
    }

    void open()
    return () => {
      isDisposed = true
      if (retryTimer) clearTimeout(retryTimer)
      if (pingTimer) clearInterval(pingTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [roomId, utils, addMessage])

  // Tick while anyone is typing, so their indicator expires on time.
  const hasTyping = Object.keys(typingUntil).length > 0
  useEffect(() => {
    if (!hasTyping) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasTyping])

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>()
    for (const m of history.data ?? []) byId.set(m.id, m)
    for (const m of live) byId.set(m.id, m)
    return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
  }, [history.data, live])

  const typing = Object.values(typingUntil)
    .filter((t) => t.until > now && t.user.id !== selfId)
    .map((t) => t.user)

  const send = useCallback(
    async (body: string) => {
      addMessage(await utils.client.chat.send.mutate({ roomId, body }))
    },
    [roomId, utils, addMessage],
  )

  const notifyTyping = useCallback(() => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (Date.now() - lastTypingRef.current < TYPING_THROTTLE_MS) return
    lastTypingRef.current = Date.now()
    ws.send(JSON.stringify({ type: 'typing' }))
  }, [])

  return {
    messages,
    isLoadingHistory: history.isLoading,
    connection,
    viewers,
    typing,
    isAssistantThinking,
    send,
    notifyTyping,
  }
}
