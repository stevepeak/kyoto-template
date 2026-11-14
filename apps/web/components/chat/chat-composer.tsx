'use client'

import { CornerDownLeft } from 'lucide-react'
import { type KeyboardEvent, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ChatAttachMenu } from './chat-attach-menu'

const MAX_HEIGHT_PX = 160

interface ChatComposerProps {
  onSend: (body: string) => Promise<void>
  onTyping: () => void
}

/** Auto-growing message box: Enter sends, Shift+Enter adds a line. */
export function ChatComposer({ onSend, onTyping }: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  const submit = async () => {
    const body = value.trim()
    if (!body || isSending) return
    setIsSending(true)
    setValue('')
    requestAnimationFrame(resize)
    try {
      await onSend(body)
    } catch {
      setValue(body)
      toast.error('Message not sent — try again.')
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-2xl border border-input bg-background py-2 pr-2 pl-4 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          placeholder="Message the room…"
          aria-label="Message"
          maxLength={4000}
          onChange={(e) => {
            setValue(e.target.value)
            resize()
            if (e.target.value) onTyping()
          }}
          onKeyDown={handleKeyDown}
          className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!value.trim() || isSending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Send"
          title="Enter to send"
        >
          <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {/* The spacer mirrors the + so the note is centred on the box. */}
      <div className="mt-1.5 grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <ChatAttachMenu />
        <p className="text-center text-xs text-muted-foreground">
          AI can make mistakes. Check important info.
        </p>
        <span aria-hidden="true" />
      </div>
    </div>
  )
}
