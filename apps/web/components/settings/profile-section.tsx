'use client'

import { UserCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { authClient } from '@/lib/auth-client'

import { FieldMessage, SectionCard } from './section-card'
import { inputClass, labelClass, primaryButtonClass } from './styles'

interface ProfileSectionProps {
  initialName: string
  email: string
}

export function ProfileSection({ initialName, email }: ProfileSectionProps) {
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({})

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed !== saved && !isSaving

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    setMsg({})
    const { error } = await authClient.updateUser({ name: trimmed })
    setIsSaving(false)
    if (error) {
      setMsg({ error: error.message || 'Failed to update your name' })
      return
    }
    setSaved(trimmed)
    setMsg({ success: 'Name updated' })
  }

  return (
    <SectionCard
      title="Profile"
      description="How you appear across the app."
      icon={UserCircle}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="profile-name" className={labelClass}>
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="profile-email" className={labelClass}>
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            disabled
            className={inputClass}
          />
          {/* TODO: enable Better Auth's `user.changeEmail` to let users edit this. */}
          <p className="mt-1 text-xs text-gray-500">
            Your sign-in email can&apos;t be changed yet.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSave}
            className={primaryButtonClass}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
      <FieldMessage error={msg.error} success={msg.success} />
    </SectionCard>
  )
}
