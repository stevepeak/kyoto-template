'use client'

import { useState } from 'react'

import { trpc } from '../lib/trpc'

export default function HomePage() {
  const [name, setName] = useState('')
  const [runId, setRunId] = useState<string | null>(null)

  const triggerMutation = trpc.trigger.exampleAgent.useMutation({
    onSuccess: (data) => {
      setRunId(data.runId)
    },
  })

  const handleTrigger = () => {
    triggerMutation.mutate({ name: name || undefined })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Hello World</h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggerMutation.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {triggerMutation.isPending
            ? 'Triggering...'
            : 'Trigger Example Agent'}
        </button>
        {runId && (
          <div className="mt-4 rounded bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Task triggered! Run ID: <code className="font-mono">{runId}</code>
            </p>
          </div>
        )}
        {triggerMutation.error && (
          <div className="mt-4 rounded bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Error: {triggerMutation.error.message}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
