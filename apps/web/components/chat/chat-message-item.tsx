'use client'

import type { ChatMessage } from '@app/workflows-client'
import { AlertTriangle, Check, Copy, Workflow } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { ChatAvatar } from './chat-avatar'

const COPIED_MS = 1500

interface ChatMessageItemProps {
  message: ChatMessage
  isOwn: boolean
  /** Same author as the message above — hide the avatar and name. */
  isContinuation: boolean
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const actionClass =
  'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'

/** One message: avatar, name, bubble, and hover actions (copy, inspect in 007). */
export function ChatMessageItem({
  message,
  isOwn,
  isContinuation,
}: ChatMessageItemProps) {
  const [isCopied, setIsCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body)
    } catch {
      return
    }
    setIsCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsCopied(false), COPIED_MS)
  }

  const isFailed = message.status === 'failed'
  const name = message.author?.name ?? 'Assistant'
  // People get bubbles; the assistant writes straight onto the page.
  const bubbleClass = isFailed
    ? 'rounded-2xl rounded-bl-md border border-destructive/40 bg-destructive/5 px-3.5 py-2 text-foreground'
    : message.role === 'assistant'
      ? 'px-1 text-foreground'
      : isOwn
        ? 'rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground'
        : 'rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-foreground'

  return (
    <div
      className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${
        isContinuation ? 'mt-0.5' : 'mt-3'
      }`}
    >
      <div className="w-8 shrink-0">
        {!isContinuation && !isOwn && <ChatAvatar user={message.author} />}
      </div>
      <div
        className={`flex min-w-0 max-w-[80%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}
      >
        {!isContinuation && (
          <div className="mb-1 flex items-baseline gap-2 px-1 text-xs">
            {!isOwn && (
              <span className="font-medium text-foreground">{name}</span>
            )}
            <span className="text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        <div
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${bubbleClass}`}
        >
          {isFailed && (
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              The assistant couldn&apos;t reply
            </span>
          )}
          {message.body}
        </div>
        <div className="mt-0.5 flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={actionClass}
            aria-label="Copy message"
            title={isCopied ? 'Copied' : 'Copy'}
          >
            {isCopied ? (
              <Check
                className="h-3.5 w-3.5 text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          {message.workflowRunId && (
            <Link
              href={`/workflows/runs/${message.workflowRunId}`}
              className={actionClass}
              aria-label="Inspect in 007"
              title="Inspect in 007"
            >
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
