import { CHAT_TRIGGER_KIND } from '@app/workflows-client'
import {
  agentConfigSchema,
  assignWorkflow,
  createAgent,
  createWorkflow,
  resolveAssignedVersion,
  type WfDb,
  workflowGraphSchema,
} from '@stevepeak/007'

import { listModels } from './model'

type AssignedVersion = NonNullable<
  Awaited<ReturnType<typeof resolveAssignedVersion>>
>

/**
 * The workflow assigned to `chat_message`, seeding a starter one on first use:
 * trigger → "Hello World Assistant" agent → output. After that it's yours —
 * edit the agent or rewire the workflow in /workflows; this never overwrites.
 */
export async function ensureChatWorkflow(db: WfDb): Promise<AssignedVersion> {
  const assigned = await resolveAssignedVersion(db, {
    triggerKind: CHAT_TRIGGER_KIND,
  })
  if (assigned) return assigned

  try {
    await seedChatWorkflow(db)
  } catch (error) {
    // Two first messages raced and the other seed won the slug — use its.
    const winner = await resolveAssignedVersion(db, {
      triggerKind: CHAT_TRIGGER_KIND,
    })
    if (winner) return winner
    throw error
  }
  const seeded = await resolveAssignedVersion(db, {
    triggerKind: CHAT_TRIGGER_KIND,
  })
  if (!seeded) throw new Error('Seeded the chat workflow but it has no version')
  return seeded
}

async function seedChatWorkflow(db: WfDb): Promise<void> {
  const { agentId } = await createAgent(db, {
    name: 'Hello World Assistant',
    slug: 'hello-world-assistant',
    description: 'Replies in the app chat.',
    config: agentConfigSchema.parse({
      modelId: listModels()[0].id,
      // Mirrors v2, authored and published through the 007 MCP. The live
      // agent is edited in /workflows; this only seeds a fresh database.
      // TODO: give the assistant your product's voice and tools.
      prompt:
        'You are the Assistant in a group chat inside a web app. Several people may be talking at once; address them by name when it helps. Lines in the conversation starting with "Assistant:" are your own earlier replies — stay consistent with them and don\'t repeat yourself. Reply in plain text (no Markdown), a few sentences at most.',
      userPrompt:
        "Conversation so far, oldest first (the last line is ${authorName}'s new message):\n${transcript}\n\nWrite your reply to ${authorName}. Their new message was: ${text}",
    }),
  })

  const fromTrigger = (path: string) => {
    return { kind: 'ref', nodeId: 'trigger', path }
  }
  const { workflowId } = await createWorkflow(db, {
    name: 'Chat reply',
    slug: 'chat-reply',
    description: 'Answers a chat message with the Hello World Assistant.',
    graph: workflowGraphSchema.parse({
      version: 1,
      nodes: [
        {
          id: 'trigger',
          kind: 'trigger',
          label: 'Chat message',
          position: { x: 0, y: 0 },
          // Inline: someone is waiting on the reply.
          config: { triggerKind: CHAT_TRIGGER_KIND, engine: 'inline' },
        },
        {
          id: 'assistant',
          kind: 'agent',
          label: 'Hello World Assistant',
          position: { x: 280, y: 0 },
          config: {
            agentId,
            inputs: {
              transcript: fromTrigger('transcript'),
              authorName: fromTrigger('authorName'),
              text: fromTrigger('text'),
            },
          },
        },
        {
          id: 'reply',
          kind: 'output',
          label: 'Reply',
          position: { x: 560, y: 0 },
          config: {
            source: { kind: 'ref', nodeId: 'assistant', path: 'text' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'assistant', condition: null },
        { id: 'e2', source: 'assistant', target: 'reply', condition: null },
      ],
    }),
  })
  await assignWorkflow(db, { triggerKind: CHAT_TRIGGER_KIND, workflowId })
}
