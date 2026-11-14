'use client'

import { Bell, Lock } from 'lucide-react'

import { trpc } from '@/lib/trpc'

import { FieldMessage, SectionCard } from './section-card'

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-gray-900' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/** Per-category email opt-outs; security mail is shown but locked on. */
export function NotificationsSection() {
  const utils = trpc.useUtils()
  const prefs = trpc.notifications.preferences.useQuery()
  const setPreference = trpc.notifications.setPreference.useMutation({
    // Flip the switch immediately; roll back if the save fails.
    onMutate: async ({ category, enabled }) => {
      await utils.notifications.preferences.cancel()
      const previous = utils.notifications.preferences.getData()
      utils.notifications.preferences.setData(undefined, (rows) => {
        return rows?.map((r) =>
          r.category === category ? { ...r, enabled } : r,
        )
      })
      return { previous }
    },
    onError: (_error, _input, context) => {
      utils.notifications.preferences.setData(undefined, context?.previous)
    },
    onSettled: () => utils.notifications.preferences.invalidate(),
  })

  return (
    <SectionCard
      title="Email notifications"
      description="Choose which optional emails we send you."
      icon={Bell}
    >
      {prefs.isPending ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          <li className="flex items-center gap-3 py-3 first:pt-0">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                Security & account
                <Lock
                  className="h-3.5 w-3.5 text-gray-400"
                  aria-hidden="true"
                />
              </p>
              <p className="text-sm text-gray-500">
                Sign-in links, password resets and new-device alerts. Always on.
              </p>
            </div>
            <Toggle checked disabled label="Security & account emails" />
          </li>
          {(prefs.data ?? []).map((pref) => (
            <li
              key={pref.category}
              className="flex items-center gap-3 py-3 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {pref.label}
                </p>
                <p className="text-sm text-gray-500">{pref.description}</p>
              </div>
              <Toggle
                checked={pref.enabled}
                label={pref.label}
                onChange={(enabled) => {
                  setPreference.mutate({ category: pref.category, enabled })
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <FieldMessage
        error={
          prefs.error?.message ??
          (setPreference.error ? 'Couldn’t save that change.' : null)
        }
      />
    </SectionCard>
  )
}
