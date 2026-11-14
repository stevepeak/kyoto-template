import { describe, expect, test } from 'bun:test'

import { freshDb } from '@app/db/testing'
import type { WorkflowsRpc } from '@app/workflows-client'

import { createCaller } from './index'

const workflows = {} as WorkflowsRpc

describe('me.whoami', () => {
  test('returns the signed-in user', async () => {
    const user = { id: 'u-1', email: 'u-1@test', name: 'Ada' }
    const caller = createCaller({ db: freshDb(), user, workflows })
    expect(await caller.me.whoami()).toEqual({ user })
  })

  test('rejects anonymous callers', async () => {
    const caller = createCaller({ db: freshDb(), user: null, workflows })
    await expect(caller.me.whoami()).rejects.toThrow('UNAUTHORIZED')
  })
})
