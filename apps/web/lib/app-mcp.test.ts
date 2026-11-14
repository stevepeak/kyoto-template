import { createCaller } from '@app/api'
import { freshDb } from '@app/db/testing'
import type { WorkflowsRpc } from '@app/workflows-client'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, test } from 'bun:test'

import {
  type AppToolCall,
  consentGrantsAppMcp,
  createAppMcpServer,
} from './app-mcp'
import { APP_MCP_SCOPE } from './mcp-resources'

const user = { id: 'u-1', email: 'u-1@test', name: 'Ada' }

async function connect(calls: AppToolCall[] = []) {
  const caller = createCaller({
    db: freshDb(),
    user,
    workflows: {} as WorkflowsRpc,
  })
  const server = createAppMcpServer(caller, (call) => {
    calls.push(call)
    return Promise.resolve()
  })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await server.connect(serverSide)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientSide)
  return client
}

describe('app MCP', () => {
  test('lists whoami as a read-only tool', async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    const whoami = tools.find((t) => t.name === 'whoami')
    expect(whoami?.annotations?.readOnlyHint).toBe(true)
  })

  test('whoami returns the signed-in user', async () => {
    const client = await connect()
    const result = await client.callTool({
      name: 'whoami',
      arguments: { intent: 'Check which account is connected.' },
    })
    const [content] = result.content as { type: string; text: string }[]
    expect(JSON.parse(content.text)).toEqual({ user })
  })

  test('every tool requires an intent, listed first', async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    for (const tool of tools) {
      expect(tool.inputSchema.required).toContain('intent')
      expect(Object.keys(tool.inputSchema.properties ?? {})[0]).toBe('intent')
    }
  })

  test('a call without an intent is refused and not recorded', async () => {
    const calls: AppToolCall[] = []
    const client = await connect(calls)
    const result = await client.callTool({ name: 'whoami', arguments: {} })
    expect(result.isError).toBe(true)
    expect(calls).toEqual([])
  })

  test('records the call with its intent, minus the intent in arguments', async () => {
    const calls: AppToolCall[] = []
    const client = await connect(calls)
    await client.callTool({
      name: 'whoami',
      arguments: { intent: '  Check which account is connected.  ' },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      tool: 'whoami',
      intent: 'Check which account is connected.',
      arguments: {},
      ok: true,
      error: null,
    })
  })

  test('a revoked consent no longer grants the app MCP', () => {
    expect(consentGrantsAppMcp([APP_MCP_SCOPE, 'openid'])).toBe(true)
    // What the plugin actually stores: a JSON string inside the json column.
    expect(consentGrantsAppMcp(JSON.stringify(['openid', APP_MCP_SCOPE]))).toBe(
      true,
    )
    expect(consentGrantsAppMcp(['wf:read'])).toBe(false)
    expect(consentGrantsAppMcp(null)).toBe(false)
  })
})
