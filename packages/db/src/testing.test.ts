import { describe, expect, test } from 'bun:test'
import { inArray } from 'drizzle-orm'

import { D1_LIMITS } from './d1-limits'
import * as schema from './schema'
import { addUser, freshDb } from './testing'

// A query that breaks on D1 has to break here too, or CI passes code that
// production rejects.
describe('freshDb enforces D1 limits', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `u-${i}`)

  test('rejects a statement binding more than 100 parameters', async () => {
    const db = freshDb()
    // A Drizzle query is a lazy thenable; `.then` is what runs it.
    const query = (n: number) => {
      return db
        .select()
        .from(schema.user)
        .where(inArray(schema.user.id, ids(n)))
        .then((rows) => rows)
    }
    await expect(query(D1_LIMITS.boundParams)).resolves.toEqual([])
    await expect(query(D1_LIMITS.boundParams + 1)).rejects.toThrow(
      'too many SQL variables',
    )
  })

  test('rejects a value larger than D1 stores', async () => {
    const db = freshDb()
    const name = 'x'.repeat(D1_LIMITS.valueBytes + 1)
    const insert = db
      .insert(schema.user)
      .values({
        id: 'u-1',
        name,
        email: 'u-1@test',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .then(() => null)
    await expect(insert).rejects.toThrow('string or blob too big')
  })

  test('rejects an interactive transaction', () => {
    const db = freshDb()
    expect(() => db.transaction(async () => {})).toThrow(
      'interactive transactions',
    )
  })

  test('replays the auth migrations', async () => {
    const db = freshDb()
    await addUser(db, { id: 'u-1' })
    const rows = await db.select().from(schema.user)
    expect(rows.map((r) => r.email)).toEqual(['u-1@test'])
  })
})
