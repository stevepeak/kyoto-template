import { describe, expect, test } from 'bun:test'

import { schema } from '@app/db'
import { freshDb } from '@app/db/testing'
import type { WorkflowsRpc } from '@app/workflows-client'

import { createCaller } from './index'

const user = { id: 'u-1', email: 'ada@test', name: 'Ada' }

async function setup() {
  const db = freshDb()
  await db.insert(schema.user).values({
    id: user.id,
    name: 'Ada',
    email: user.email,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const calls: { method: string; input: unknown }[] = []
  const workflows = {
    chatPublish: (input: unknown) => {
      calls.push({ method: 'chatPublish', input })
      return Promise.resolve()
    },
    chatReply: (input: unknown) => {
      calls.push({ method: 'chatReply', input })
      return Promise.resolve({ workflowRunId: 'run-1' })
    },
  } as unknown as WorkflowsRpc
  return { caller: createCaller({ db, user, workflows }), calls }
}

describe('chat', () => {
  test('send stores, publishes, and asks 007 for a reply', async () => {
    const { caller, calls } = await setup()
    const message = await caller.chat.send({ roomId: 'lobby', body: ' hi ' })

    expect(message).toMatchObject({
      role: 'user',
      body: 'hi',
      author: { id: 'u-1', name: 'Ada', image: null },
    })
    expect(await caller.chat.history({ roomId: 'lobby' })).toEqual([message])
    expect(calls.map((c) => c.method)).toEqual(['chatPublish', 'chatReply'])
    expect(calls[1].input).toMatchObject({
      roomId: 'lobby',
      actorId: 'u-1',
      trigger: { messageId: message.id, transcript: 'Ada: hi' },
    })
  })

  test('rejects anonymous callers and bad room ids', async () => {
    const { caller } = await setup()
    await expect(
      caller.chat.history({ roomId: 'Not A Room!' }),
    ).rejects.toThrow()
    const anon = createCaller({
      db: freshDb(),
      user: null,
      workflows: {} as WorkflowsRpc,
    })
    await expect(anon.chat.history({ roomId: 'lobby' })).rejects.toThrow(
      'UNAUTHORIZED',
    )
  })

  test('rooms lists rooms newest activity first with their last message', async () => {
    const { caller } = await setup()
    const { id } = await caller.chat.createRoom({ name: 'Team Standup!' })
    expect(id).toMatch(/^team-standup-[a-z0-9-]{6}$/)
    await Bun.sleep(5)
    await caller.chat.send({ roomId: 'lobby', body: 'first' })

    const rooms = await caller.chat.rooms()
    expect(rooms.map((r) => r.name)).toEqual(['lobby', 'Team Standup!'])
    expect(rooms[0]).toMatchObject({
      messageCount: 1,
      lastMessage: { body: 'first', authorName: 'Ada' },
    })
    expect(rooms[1]).toMatchObject({ messageCount: 0, lastMessage: null })
  })
})
