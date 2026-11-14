import { describe, expect, test } from 'bun:test'

import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token'

const SECRET = 'test-secret'

describe('unsubscribe tokens', () => {
  test('round-trip', async () => {
    const token = await signUnsubscribeToken(
      { userId: 'u-1', category: 'tips' },
      SECRET,
    )
    expect(await verifyUnsubscribeToken(token, SECRET)).toEqual({
      userId: 'u-1',
      category: 'tips',
    })
  })

  test('rejects a token signed with another secret', async () => {
    const token = await signUnsubscribeToken(
      { userId: 'u-1', category: 'tips' },
      'other',
    )
    expect(await verifyUnsubscribeToken(token, SECRET)).toBeNull()
  })

  test('rejects a payload swapped onto a valid signature', async () => {
    const mine = await signUnsubscribeToken(
      { userId: 'me', category: 'tips' },
      SECRET,
    )
    const theirs = await signUnsubscribeToken(
      { userId: 'victim', category: 'tips' },
      SECRET,
    )
    const forged = `${theirs.split('.')[0]}.${mine.split('.')[1]}`
    expect(await verifyUnsubscribeToken(forged, SECRET)).toBeNull()
  })

  test('rejects garbage', async () => {
    for (const bad of ['', 'abc', 'a.b.c', '!!!.???']) {
      expect(await verifyUnsubscribeToken(bad, SECRET)).toBeNull()
    }
  })
})
