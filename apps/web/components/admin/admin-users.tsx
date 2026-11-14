'use client'

import { Ban, Loader2, LogIn, Search, ShieldCheck, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { FieldMessage, SectionCard } from '@/components/settings/section-card'
import { inputClass, secondaryButtonClass } from '@/components/settings/styles'
import { authClient } from '@/lib/auth-client'

/** Users per page. */
const PAGE_SIZE = 25

type AdminUser = {
  id: string
  name: string
  email: string
  createdAt: string | Date
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

interface AdminUsersProps {
  /** The admin themselves — no banning or impersonating your own account. */
  currentUserId: string
}

/** Searchable, paged user list with ban / unban / impersonate. */
export function AdminUsers({ currentUserId }: AdminUsersProps) {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    const { data, error } = await authClient.admin.listUsers({
      query: {
        limit: PAGE_SIZE,
        offset,
        sortBy: 'createdAt',
        sortDirection: 'desc',
        ...(query
          ? {
              searchField: 'email' as const,
              searchOperator: 'contains' as const,
              searchValue: query,
            }
          : {}),
      },
    })
    if (error) {
      setError(error.message || 'Failed to load users')
      setUsers((prev) => prev ?? [])
      return
    }
    setUsers(data?.users ?? [])
    setTotal(data?.total ?? 0)
  }, [offset, query])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on page/search change
    void loadUsers()
  }, [loadUsers])

  const run = async (
    userId: string,
    action: () => Promise<{ error: { message?: string } | null }>,
  ) => {
    setError(null)
    setBusyId(userId)
    const { error } = await action()
    if (error) setError(error.message || 'That didn’t work')
    else await loadUsers()
    setBusyId(null)
  }

  const handleImpersonate = async (userId: string) => {
    setError(null)
    setBusyId(userId)
    const { error } = await authClient.admin.impersonateUser({ userId })
    if (error) {
      setError(error.message || 'Failed to impersonate')
      setBusyId(null)
      return
    }
    router.push('/')
    router.refresh()
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setOffset(0)
    setQuery(search.trim())
  }

  return (
    <SectionCard
      title="Users"
      description={users ? `${total} total` : undefined}
      icon={ShieldCheck}
    >
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email"
          aria-label="Search by email"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" className={secondaryButtonClass}>
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </form>

      {users === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500">No users found.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = u.id === currentUserId
            const busy = busyId === u.id
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 truncate text-sm font-medium text-gray-900">
                    {u.name || u.email}
                    {u.role === 'admin' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Admin
                      </span>
                    )}
                    {u.banned && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Banned
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-gray-500">
                    {[
                      u.name ? u.email : null,
                      `Joined ${dateFormat.format(new Date(u.createdAt))}`,
                      u.banned && u.banReason ? u.banReason : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {!isSelf && (
                  <div className="flex gap-2">
                    {busy && (
                      <Loader2
                        className="h-4 w-4 animate-spin self-center text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                    {u.banned ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          return run(u.id, () => {
                            return authClient.admin.unbanUser({ userId: u.id })
                          })
                        }}
                        className={secondaryButtonClass}
                      >
                        <Undo2 className="h-4 w-4" aria-hidden="true" />
                        Unban
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => handleImpersonate(u.id)}
                          className={secondaryButtonClass}
                        >
                          <LogIn className="h-4 w-4" aria-hidden="true" />
                          Sign in as
                        </button>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => {
                            return run(u.id, () => {
                              return authClient.admin.banUser({ userId: u.id })
                            })
                          }}
                          className={`${secondaryButtonClass} text-red-700 hover:bg-red-50`}
                        >
                          <Ban className="h-4 w-4" aria-hidden="true" />
                          Ban
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className={secondaryButtonClass}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className={secondaryButtonClass}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <FieldMessage error={error} />
    </SectionCard>
  )
}
