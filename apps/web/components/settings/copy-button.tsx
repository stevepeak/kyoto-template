'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { secondaryButtonClass } from './styles'

// How long the button stays in its "copied" state before reverting.
const CONFIRM_MS = 1600

/**
 * Copies `value` and confirms it in place — a clipboard write is otherwise
 * invisible, so a user can't tell a click that worked from one that didn't.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Denied outside a secure context; leaving it unconfirmed is the signal.
      return
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), CONFIRM_MS)
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={label}
      className={`${secondaryButtonClass} shrink-0`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
