import { createDb, schema } from '@app/db'
import { ensureChatWorkflow, type HostDeps, wfConfig } from '@app/wf-host'
import {
  CHAT_TRIGGER_KIND,
  type ChatMessage,
  type ChatTriggerInput,
  type ChatUser,
} from '@app/workflows-client'
import type { RunContext, WfSdkConfig } from '@stevepeak/007'
import { startGraphRun } from '@stevepeak/007/cloudflare'
import { createWfDb } from '@stevepeak/007/storage'

import { signChatToken } from './auth'

function chatRoom(env: Env, roomId: string) {
  return env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId))
}

/** A WebSocket URL into the room, carrying a token that admits `user`. */
export async function chatConnect(
  env: Env,
  input: { roomId: string; user: ChatUser },
): Promise<{ url: string }> {
  const token = await signChatToken({
    roomId: input.roomId,
    user: input.user,
    secret: env.TOKEN_SIGNING_KEY,
  })
  const base = env.PUBLIC_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')
  return {
    url: `${base}/chat/${input.roomId}/ws?token=${encodeURIComponent(token)}`,
  }
}

export async function chatPublish(
  env: Env,
  input: { roomId: string; message: ChatMessage },
): Promise<void> {
  await chatRoom(env, input.roomId).publish(input.message)
}

/**
 * Start the 007 run that answers `trigger.messageId`. The run's hooks
 * (below) store and publish the reply, so this returns as soon as it starts.
 */
export async function chatReply(
  env: Env,
  input: { roomId: string; actorId: string; trigger: ChatTriggerInput },
): Promise<{ workflowRunId: string }> {
  const assigned = await ensureChatWorkflow(createWfDb(env.WF_DB))
  const room = chatRoom(env, input.roomId)
  // Before the start: an inline run can finish before startGraphRun returns.
  await room.replyStarted(input.trigger.messageId)
  try {
    const run = await startGraphRun(env, {
      workflowVersionId: assigned.versionId,
      triggerKind: CHAT_TRIGGER_KIND,
      triggerInput: input.trigger,
      subjectId: input.roomId,
      actorId: input.actorId,
      hostContext: {
        roomId: input.roomId,
        messageId: input.trigger.messageId,
      },
    })
    return { workflowRunId: run.workflowRunId }
  } catch (error) {
    await room.replyFinished(input.trigger.messageId)
    throw error
  }
}

/** Store an assistant message from a finished chat run, then fan it out. */
async function postAssistantMessage(
  ctx: RunContext,
  args: { body: string; status: ChatMessage['status']; runId?: string },
): Promise<void> {
  const roomId = ctx.hostContext?.roomId
  const messageId = ctx.hostContext?.messageId
  if (ctx.triggerKind !== CHAT_TRIGGER_KIND || !roomId || !messageId) return

  // The hooks run inside this Worker (RunRoom / GraphWorkflow), so `env` is ours.
  const env = ctx.env as Env
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    roomId,
    role: 'assistant',
    body: args.body,
    author: null,
    status: args.status,
    workflowRunId: args.runId ?? ctx.runId ?? null,
    createdAt: Date.now(),
  }
  await createDb(env.DB)
    .insert(schema.chatMessage)
    .values({
      id: message.id,
      roomId,
      userId: null,
      role: 'assistant',
      body: message.body,
      status: message.status,
      workflowRunId: message.workflowRunId,
      createdAt: new Date(message.createdAt),
    })
  const room = chatRoom(env, roomId)
  await room.publish(message)
  await room.replyFinished(messageId)
}

/**
 * The host config this Worker runs 007 with: the shared `wfConfig` plus the
 * run hooks that turn a finished `chat_message` run into a chat reply. The
 * hooks live here, not in @app/wf-host, because they need this Worker's
 * bindings (CHAT_ROOM) — the web app never executes runs.
 */
export const workerWfConfig: WfSdkConfig<HostDeps> = {
  ...wfConfig,
  onRunComplete: async (ctx, { output }) => {
    await postAssistantMessage(ctx, {
      body: typeof output === 'string' ? output : JSON.stringify(output),
      status: 'sent',
    })
  },
  onRunFailed: async (ctx, failure) => {
    await postAssistantMessage(ctx, {
      body: failure.error,
      status: 'failed',
      runId: failure.workflowRunId,
    })
  },
}
