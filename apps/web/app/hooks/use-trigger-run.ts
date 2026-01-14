import { useRealtimeRun, useRealtimeStream } from '@trigger.dev/react-hooks'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseTriggerRunOptions<T = unknown> {
  triggerDevRunId: string | null
  /**
   * Public access token for the Trigger.dev run.
   * If not provided but `triggerDevRunId` is set and `fetchPublicAccessToken` is provided,
   * the token will be fetched automatically.
   */
  triggerDevPublicAccessToken?: string | null
  /**
   * Optional function to fetch the public access token when not provided.
   * Called when `triggerDevRunId` is set but `triggerDevPublicAccessToken` is null/undefined.
   */
  fetchPublicAccessToken?: () => Promise<string | null>
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

interface UseTriggerRunResult<T = unknown> {
  run: ReturnType<typeof useRealtimeRun>['run']
  error: ReturnType<typeof useRealtimeRun>['error']
  isLoading: boolean
  isCompleted: boolean
  isFailed: boolean
  output: T | null
  isFetchingToken: boolean
}

/**
 * Reusable hook for waiting on a Trigger.dev run to complete.
 *
 * @example
 * ```tsx
 * // Using token from trigger mutation response (recommended)
 * const triggerMutation = trpc.trigger.exampleAgent.useMutation()
 *
 * // Trigger the task
 * const handle = await triggerMutation.mutateAsync({ name: 'example' })
 *
 * // Track the run with the returned token
 * const { output, isLoading, isCompleted, error } = useTriggerRun({
 *   triggerDevRunId: handle?.runId ?? null,
 *   triggerDevPublicAccessToken: handle?.publicAccessToken ?? null,
 *   onComplete: (result) => console.log('Run completed:', result),
 *   onError: (err) => console.error('Run failed:', err),
 *   onStreamText: (text) => console.log('Stream text:', text),
 * })
 *
 * // With async token fetch (for cases where token needs to be fetched separately)
 * const { output, isLoading, isFetchingToken } = useTriggerRun({
 *   triggerDevRunId: runId,
 *   fetchPublicAccessToken: async () => {
 *     // Fetch token from your API or storage
 *     const result = await fetchTokenFromApi(runId)
 *     return result.publicAccessToken
 *   },
 * })
 * ```
 */
export function useTriggerRun<T = unknown>({
  triggerDevRunId,
  triggerDevPublicAccessToken,
  fetchPublicAccessToken,
  showToast = true,
  toastMessages = {},
  onComplete,
  onError,
  onStreamText,
}: UseTriggerRunOptions<T>): UseTriggerRunResult<T> {
  const [fetchedToken, setFetchedToken] = useState<string | null>(null)
  const [isFetchingToken, setIsFetchingToken] = useState(false)
  const fetchAttemptedRef = useRef<string | null>(null)

  // Determine the effective token to use
  const effectiveToken = triggerDevPublicAccessToken ?? fetchedToken

  // Auto-fetch token when run ID is provided but token is not
  useEffect(() => {
    const shouldFetch =
      triggerDevRunId &&
      !triggerDevPublicAccessToken &&
      fetchPublicAccessToken &&
      fetchAttemptedRef.current !== triggerDevRunId

    if (!shouldFetch) {
      return
    }

    fetchAttemptedRef.current = triggerDevRunId
    setIsFetchingToken(true)

    fetchPublicAccessToken()
      .then((token) => {
        if (token) {
          setFetchedToken(token)
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          '[useTriggerRun] Failed to fetch public access token:',
          err,
        )
      })
      .finally(() => {
        setIsFetchingToken(false)
      })
  }, [triggerDevRunId, triggerDevPublicAccessToken, fetchPublicAccessToken])

  // Reset fetched token when run ID changes
  useEffect(() => {
    if (!triggerDevRunId) {
      setFetchedToken(null)
      fetchAttemptedRef.current = null
    }
  }, [triggerDevRunId])

  const isEnabled = Boolean(triggerDevRunId && effectiveToken)

  const toastIdRef = useRef<string | number | null>(null)
  const streamTextRef = useRef<string>('')
  const lastRunIdRef = useRef<string | null>(null)
  const handledCompletionRef = useRef<string | null>(null)

  // Store callbacks in refs to avoid infinite loops from dependency changes
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  const onStreamTextRef = useRef(onStreamText)
  const toastMessagesRef = useRef(toastMessages)

  // Keep refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
    onStreamTextRef.current = onStreamText
    toastMessagesRef.current = toastMessages
  })

  const { run, error: runError } = useRealtimeRun(triggerDevRunId ?? '', {
    accessToken: effectiveToken ?? undefined,
    enabled: isEnabled,
  })

  const needsStream = isEnabled && (onStreamText !== undefined || showToast)
  const { parts: streamParts } = useRealtimeStream<string>(
    triggerDevRunId ?? '',
    'progress',
    {
      accessToken: effectiveToken ?? undefined,
      enabled: needsStream,
    },
  )

  // Reset when triggerDevRunId changes
  useEffect(() => {
    if (triggerDevRunId !== lastRunIdRef.current) {
      lastRunIdRef.current = triggerDevRunId
      streamTextRef.current = ''
      handledCompletionRef.current = null

      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
    }
  }, [triggerDevRunId])

  // Toast management
  useEffect(() => {
    if (!showToast || !isEnabled) {
      return
    }

    if (!toastIdRef.current && triggerDevRunId) {
      const message = toastMessagesRef.current.onProgress?.('') ?? 'Loading...'
      toastIdRef.current = toast.loading(message)
    }
  }, [triggerDevRunId, isEnabled, showToast])

  // Stream handling
  useEffect(() => {
    if (!streamParts?.length) {
      return
    }

    const fullText = streamParts.join('\n')
    const currentLines = streamTextRef.current.split('\n').filter(Boolean)
    const newParts = streamParts.slice(currentLines.length)

    if (newParts.length > 0) {
      streamTextRef.current = fullText
      newParts.forEach((text: string) => {
        onStreamTextRef.current?.(text)
      })

      // KEEP THIS LOG
      // eslint-disable-next-line no-console
      console.log('[useTriggerRun 🌊] streaming...', streamParts)

      if (showToast && toastIdRef.current) {
        const message = toastMessagesRef.current.onProgress
          ? toastMessagesRef.current.onProgress(fullText)
          : (streamParts[streamParts.length - 1] ?? 'Loading...')
        toast.loading(message, { id: toastIdRef.current })
      }
    }
  }, [streamParts, showToast])

  // Completion/error handling
  useEffect(() => {
    if (!run || run.id !== triggerDevRunId) {
      return
    }

    // Only handle completion/error states
    if (!run.isCompleted && !run.isFailed && !run.isCancelled) {
      return
    }

    // Prevent handling the same completion/error multiple times
    const completionKey = `${triggerDevRunId}-${run.status}`
    if (handledCompletionRef.current === completionKey) {
      return
    }

    // Mark as handled immediately to prevent race conditions
    handledCompletionRef.current = completionKey

    if (run.isCompleted) {
      // Only show toast if we have a toast ID (meaning we haven't shown it yet)
      if (showToast && toastIdRef.current) {
        const message =
          toastMessagesRef.current.onSuccess ?? 'Sync completed successfully'
        toast.success(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onCompleteRef.current?.(run.output as T)
    } else if (run.isFailed || run.isCancelled) {
      const error = new Error('Workflow failed')
      // Only show toast if we have a toast ID (meaning we haven't shown it yet)
      if (showToast && toastIdRef.current) {
        const message = toastMessagesRef.current.onError
          ? toastMessagesRef.current.onError(error)
          : error.message
        toast.error(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onErrorRef.current?.(error)
    }
  }, [run, triggerDevRunId, showToast])

  // Handle runError
  useEffect(() => {
    if (!runError) {
      return
    }

    const error =
      runError instanceof Error ? runError : new Error(String(runError))

    if (showToast && toastIdRef.current) {
      const message = toastMessagesRef.current.onError
        ? toastMessagesRef.current.onError(error)
        : error.message
      toast.error(message, { id: toastIdRef.current })
      toastIdRef.current = null
    }
    onErrorRef.current?.(error)
  }, [runError, showToast])

  const isLoading =
    isFetchingToken ||
    (isEnabled &&
      runError === null &&
      (run == null || !['COMPLETED', 'FAILED', 'CRASHED'].includes(run.status)))

  const isCompleted = run?.status === 'COMPLETED' || false
  const isFailed =
    (run?.status === 'FAILED' || run?.status === 'CRASHED') ?? false

  const output = run?.status === 'COMPLETED' ? (run.output as T) : null

  return {
    run,
    error: runError,
    isLoading,
    isCompleted,
    isFailed,
    output,
    isFetchingToken,
  }
}
