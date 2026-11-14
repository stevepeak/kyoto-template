import { describe, expect, test } from 'bun:test'

import { createCaller } from '@app/api'
import { freshDb } from '@app/db/testing'
import type { WorkflowsRpc } from '@app/workflows-client'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { consentGrantsAppMcp, createAppMcpServer } from './app-mcp'
import { APP_MCP_SCOPE } from './mcp-resources'

const user = { id: 'u-1', email: 'u-1@test', name: 'Ada' }

async function connect() {
  const caller = createCaller({
    db: freshDb(),
    user,
    workflows: {} as WorkflowsRpc,
  })
  const server = createAppMcpServer(caller)
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
    const result = await client.callTool({ name: 'whoami', arguments: {} })
    const [content] = result.content as { type: string; text: string }[]
    expect(JSON.parse(content.text)).toEqual({ user })
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
