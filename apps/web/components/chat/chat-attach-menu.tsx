'use client'

import { Paperclip, Plus } from 'lucide-react'
import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { toast } from 'sonner'

function noopSubscribe(): () => void {
  return () => {}
}

/**
 * Ghost "+" under the composer: a menu with "Upload file" (⌘U / Ctrl U,
 * which also works from anywhere on the page while the chat is open).
 */
export function ChatAttachMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  )

  const openPicker = () => {
    setIsOpen(false)
    fileRef.current?.click()
  }

  // ⌘U / Ctrl U opens the picker (and keeps the browser's view-source away).
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey
      if (!isModifier || event.altKey || event.shiftKey) return
      if (event.key.toLowerCase() !== 'u') return
      event.preventDefault()
      setIsOpen(false)
      fileRef.current?.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    // TODO: upload to R2 and attach to the message (a `chat_attachment`
    // table + a bucket binding); until then say so rather than drop it.
    toast.info(
      `Attachments aren't supported yet — ${files.map((f) => f.name).join(', ')} wasn't sent.`,
    )
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Add attachment"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-10 mb-1 w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openPicker}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Paperclip
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="flex-1 text-left">Upload file</span>
            <kbd className="font-sans text-xs text-muted-foreground">
              {isMac ? '⌘U' : 'Ctrl U'}
            </kbd>
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFiles}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
