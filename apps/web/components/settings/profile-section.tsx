'use client'

import { UserCircle } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { uploadFile } from '@/lib/upload-client'

import { FieldMessage, SectionCard } from './section-card'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './styles'

interface ProfileSectionProps {
  initialName: string
  initialImage: string | null
  email: string
}

export function ProfileSection({
  initialName,
  initialImage,
  email,
}: ProfileSectionProps) {
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [image, setImage] = useState(initialImage)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({})

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsUploading(true)
    setMsg({})
    try {
      const upload = await uploadFile('/api/avatar', file)
      if ('error' in upload) {
        setMsg({ error: upload.error })
        return
      }
      const { error } = await authClient.updateUser({ image: upload.url })
      if (error) {
        setMsg({ error: error.message || 'Failed to save your photo' })
        return
      }
      setImage(upload.url)
      setMsg({ success: 'Photo updated' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    setIsUploading(true)
    setMsg({})
    const { error } = await authClient.updateUser({ image: null })
    if (error) {
      setIsUploading(false)
      setMsg({ error: error.message || 'Failed to remove your photo' })
      return
    }
    // Best effort: a leftover object is pruned on the next upload anyway.
    await fetch('/api/avatar', { method: 'DELETE' }).catch(() => {})
    setIsUploading(false)
    setImage(null)
    setMsg({ success: 'Photo removed' })
  }

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
        <div className="flex items-center gap-4">
          {image ? (
            <img
              src={image}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <UserCircle className="h-8 w-8" aria-hidden="true" />
            </span>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={secondaryButtonClass}
              >
                {isUploading
                  ? 'Saving…'
                  : image
                    ? 'Change photo'
                    : 'Upload photo'}
              </button>
              {image ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className={secondaryButtonClass}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPEG, WebP or GIF, up to 2 MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFile}
            className="hidden"
          />
        </div>
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
