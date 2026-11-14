'use client'

import { KeySquare, Loader2, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import { CopyButton } from './copy-button'
import { FieldMessage, SectionCard } from './section-card'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './styles'

type ApiKey = {
  id: string
  name: string | null
  /** The key's first few characters — all that's kept in readable form. */
  start: string | null
  createdAt: string | Date
  lastRequest: string | Date | null
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/**
 * Create and revoke personal API keys. A new key is shown once — only its hash
 * is stored, so it can't be recovered later.
 */
export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    const { data, error } = await authClient.apiKey.list()
    if (error) {
      setError(error.message || 'Failed to load API keys')
      setKeys((prev) => prev ?? [])
      return
    }
    setKeys(data?.apiKeys ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void loadKeys()
  }, [loadKeys])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    const { data, error } = await authClient.apiKey.create({
      name: keyName.trim() || 'API key',
    })
    if (error) {
      setError(error.message || 'Failed to create API key')
    } else {
      setNewKey(data?.key ?? null)
      setAdding(false)
      setKeyName('')
      await loadKeys()
    }
    setIsSaving(false)
  }

  const handleDelete = async (keyId: string) => {
    setError(null)
    setDeletingId(keyId)
    const { error } = await authClient.apiKey.delete({ keyId })
    if (error) {
      setError(error.message || 'Failed to delete API key')
    } else {
      await loadKeys()
    }
    setDeletingId(null)
  }

  return (
    <SectionCard
      title="API keys"
      description="Call the API as yourself from scripts and tools. Send the key in the x-api-key header."
      icon={KeySquare}
      action={
        adding ? null : (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setNewKey(null)
              setAdding(true)
            }}
            className={secondaryButtonClass}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create
          </button>
        )
      }
    >
      {newKey && (
        <div className="mb-5 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Copy your new key now — you won’t be able to see it again.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-md border border-emerald-200 bg-white px-3 py-1.5 font-mono text-sm text-gray-900">
              {newKey}
            </code>
            <CopyButton value={newKey} label="Copy" />
          </div>
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleCreate}
          className="mb-5 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <label htmlFor="api-key-name" className={labelClass}>
            Name this key
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="api-key-name"
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Deploy script"
              autoFocus
              className={`${inputClass} sm:flex-1`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                disabled={isSaving}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={primaryButtonClass}
              >
                {isSaving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      {keys === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500">No API keys yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-gray-900">
                  {key.name || 'API key'}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {[
                    key.start ? `${key.start}…` : null,
                    `Created ${dateFormat.format(new Date(key.createdAt))}`,
                    key.lastRequest
                      ? `Last used ${dateFormat.format(new Date(key.lastRequest))}`
                      : 'Never used',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(key.id)}
                disabled={deletingId !== null}
                aria-label={`Delete ${key.name || 'API key'}`}
                title="Delete"
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === key.id ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldMessage error={error} />
    </SectionCard>
  )
}
