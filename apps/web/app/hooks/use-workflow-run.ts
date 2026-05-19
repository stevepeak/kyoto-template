'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseWorkflowRunOptions<T = unknown> {
  runId: string | null
  accessToken: string | null
  /** Base URL of the workflows worker. Defaults to NEXT_PUBLIC_WORKFLOWS_URL. */
  baseUrl?: string
  showToast?: boolean
  toastMessages?: {
    onProgress?: (streamText: string) => string
    onSuccess?: string
    onError?: (error: Error | string) => string
  }
  onComplete?: (output: T) => void
  onError?: (error: Error | string) => void
  onStreamText?: (text: string) => void
}

interface UseWorkflowRunResult<T = unknown> {
  status: 'idle' | 'running' | 'completed' | 'failed'
  isLoading: boolean
  isCompleted: boolean
  isFailed: boolean
  output: T | null
  error: Error | null
}

const DEFAULT_BASE_URL =
  // eslint-disable-next-line no-process-env
  process.env.NEXT_PUBLIC_WORKFLOWS_URL ?? 'http://localhost:8787'

/**
 * Subscribes to a workflow run via Server-Sent Events. Mirrors the shape of
 * the old `useTriggerRun` hook so callers only need to swap the import.
 */
export function useWorkflowRun<T = unknown>({
  runId,
  accessToken,
  baseUrl = DEFAULT_BASE_URL,
  showToast = true,
  toastMessages = {},
  onComplete,
  onError,
  onStreamText,
}: UseWorkflowRunOptions<T>): UseWorkflowRunResult<T> {
  const [status, setStatus] = useState<UseWorkflowRunResult['status']>('idle')
  const [output, setOutput] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const toastIdRef = useRef<string | number | null>(null)
  const lastRunIdRef = useRef<string | null>(null)

  // Refs to keep callbacks stable across re-renders.
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  const onStreamTextRef = useRef(onStreamText)
  const toastMessagesRef = useRef(toastMessages)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
    onStreamTextRef.current = onStreamText
    toastMessagesRef.current = toastMessages
  })

  // Reset when runId changes.
  useEffect(() => {
    if (runId !== lastRunIdRef.current) {
      lastRunIdRef.current = runId
      setStatus(runId ? 'running' : 'idle')
      setOutput(null)
      setError(null)
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
    }
  }, [runId])

  useEffect(() => {
    if (!runId || !accessToken) return

    if (showToast && !toastIdRef.current) {
      const message = toastMessagesRef.current.onProgress?.('') ?? 'Loading...'
      toastIdRef.current = toast.loading(message)
    }

    const url = `${baseUrl}/runs/${runId}/stream?token=${encodeURIComponent(accessToken)}`
    const source = new EventSource(url)

    let aggregated = ''

    source.onmessage = (event) => {
      let parsed: { type: string; channel?: string; data: unknown }
      try {
        parsed = JSON.parse(event.data) as typeof parsed
      } catch {
        return
      }

      if (parsed.type === 'snapshot') {
        const snap = parsed.data as {
          status: UseWorkflowRunResult['status']
          progress: string[]
          output: unknown
          error: string | null
        }
        snap.progress.forEach((line) => onStreamTextRef.current?.(line))
        aggregated = snap.progress.join('\n')
        if (snap.status === 'completed') {
          setStatus('completed')
          setOutput(snap.output as T)
          if (snap.output != null) onCompleteRef.current?.(snap.output as T)
        } else if (snap.status === 'failed') {
          setStatus('failed')
          const err = new Error(snap.error ?? 'Workflow failed')
          setError(err)
          onErrorRef.current?.(err)
        } else {
          setStatus('running')
        }
        return
      }

      if (parsed.type === 'stream' && parsed.channel === 'progress') {
        const text = String(parsed.data ?? '')
        aggregated = aggregated ? `${aggregated}\n${text}` : text
        onStreamTextRef.current?.(text)
        if (showToast && toastIdRef.current) {
          const message = toastMessagesRef.current.onProgress
            ? toastMessagesRef.current.onProgress(aggregated)
            : text
          toast.loading(message, { id: toastIdRef.current })
        }
        return
      }

      if (parsed.type === 'output') {
        setOutput(parsed.data as T)
        return
      }

      if (parsed.type === 'status') {
        const next = parsed.data as UseWorkflowRunResult['status']
        if (next === 'completed') {
          setStatus('completed')
          if (showToast && toastIdRef.current) {
            const message =
              toastMessagesRef.current.onSuccess ?? 'Completed successfully'
            toast.success(message, { id: toastIdRef.current })
            toastIdRef.current = null
          }
          // onComplete fires here with whatever output we have buffered.
          setOutput((current) => {
            if (current != null) onCompleteRef.current?.(current)
            return current
          })
          source.close()
        } else if (next === 'failed') {
          setStatus('failed')
          const err = new Error('Workflow failed')
          setError(err)
          if (showToast && toastIdRef.current) {
            const message = toastMessagesRef.current.onError
              ? toastMessagesRef.current.onError(err)
              : err.message
            toast.error(message, { id: toastIdRef.current })
            toastIdRef.current = null
          }
          onErrorRef.current?.(err)
          source.close()
        } else {
          setStatus(next)
        }
        return
      }

      if (parsed.type === 'error') {
        const err = new Error(String(parsed.data ?? 'Workflow error'))
        setError(err)
        setStatus('failed')
        onErrorRef.current?.(err)
        source.close()
      }
    }

    source.onerror = () => {
      // Native EventSource auto-reconnects; only escalate if we never got
      // far enough to know the run was real.
      if (status === 'idle') {
        const err = new Error('Failed to connect to workflow stream')
        setError(err)
        onErrorRef.current?.(err)
        source.close()
      }
    }

    return () => {
      source.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, accessToken, baseUrl, showToast])

  return {
    status,
    isLoading: status === 'running',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    output,
    error,
  }
}
