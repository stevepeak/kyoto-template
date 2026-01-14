'use client'

import { useState } from 'react'

import { AuthCard } from './components/auth-card'
import { useTriggerRun } from './hooks/use-trigger-run'
import { trpc } from '../lib/trpc'

export default function HomePage() {
  const [runId, setRunId] = useState<string | null>(null)
  const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
    null,
  )
  const [streamOutput, setStreamOutput] = useState<string[]>([])

  const triggerMutation = trpc.trigger.exampleAgent.useMutation({
    onSuccess: (data) => {
      setRunId(data.runId)
      setPublicAccessToken(data.publicAccessToken)
      setStreamOutput([])
    },
  })

  const { isLoading, isCompleted, isFailed, output, error } = useTriggerRun({
    triggerDevRunId: runId,
    triggerDevPublicAccessToken: publicAccessToken,
    showToast: false,
    onStreamText: (text) => {
      setStreamOutput((prev) => [...prev, text])
    },
    onComplete: () => {
      // Reset for next run
    },
  })

  const handleTrigger = () => {
    triggerMutation.mutate({})
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <AuthCard />

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Hello World</h1>
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggerMutation.isPending || isLoading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {triggerMutation.isPending
            ? 'Triggering...'
            : isLoading
              ? 'Running...'
              : 'Trigger Example Agent'}
        </button>

        {runId && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="rounded bg-gray-100 p-4">
              <p className="text-sm text-gray-600">
                Run ID: <code className="font-mono text-xs">{runId}</code>
              </p>
              <p className="mt-1 text-sm">
                Status:{' '}
                <span
                  className={
                    isCompleted
                      ? 'text-green-600'
                      : isFailed
                        ? 'text-red-600'
                        : 'text-blue-600'
                  }
                >
                  {isCompleted
                    ? 'Completed'
                    : isFailed
                      ? 'Failed'
                      : 'Running...'}
                </span>
              </p>
            </div>

            {streamOutput.length > 0 && (
              <div className="rounded bg-gray-900 p-4">
                <p className="mb-2 text-xs text-gray-400">Stream Output:</p>
                <div className="max-h-64 overflow-y-auto font-mono text-sm text-green-400">
                  {streamOutput.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {isCompleted && output && (
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Output:</p>
                <pre className="mt-2 overflow-x-auto text-xs text-green-700">
                  {JSON.stringify(output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {(triggerMutation.error || error) && (
          <div className="mt-4 rounded bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Error: {triggerMutation.error?.message || error?.message}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
