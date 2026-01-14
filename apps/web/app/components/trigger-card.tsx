'use client'

import { useState } from 'react'

import { useTriggerRun } from '@/app/hooks/use-trigger-run'
import { trpc } from '@/lib/trpc'

export function TriggerCard() {
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
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Example Agent
      </h2>

      <button
        type="button"
        onClick={handleTrigger}
        disabled={triggerMutation.isPending || isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {triggerMutation.isPending
          ? 'Triggering...'
          : isLoading
            ? 'Running...'
            : 'Run Example Agent'}
      </button>

      {runId && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
              Run ID: <code className="font-mono">{runId.slice(0, 12)}...</code>
            </p>
            <p className="mt-1 text-sm">
              Status:{' '}
              <span
                className={
                  isCompleted
                    ? 'font-medium text-green-600'
                    : isFailed
                      ? 'font-medium text-red-600'
                      : 'font-medium text-blue-600'
                }
              >
                {isCompleted ? 'Completed' : isFailed ? 'Failed' : 'Running...'}
              </span>
            </p>
          </div>

          {streamOutput.length > 0 && (
            <div className="rounded-md bg-gray-900 p-3">
              <p className="mb-2 text-xs text-gray-400">Stream Output:</p>
              <div className="max-h-32 overflow-y-auto font-mono text-xs text-green-400">
                {streamOutput.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {isCompleted && output && (
            <div className="rounded-md bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">Output:</p>
              <pre className="mt-1 overflow-x-auto text-xs text-green-700">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {(triggerMutation.error || error) && (
        <div className="mt-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">
            Error: {triggerMutation.error?.message || error?.message}
          </p>
        </div>
      )}
    </div>
  )
}
