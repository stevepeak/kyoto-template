import {
  CHAT_TRIGGER_KIND,
  chatTriggerInputSchema,
} from '@app/workflows-client'
import type { TriggerRegistry } from '@stevepeak/007'

/**
 * Event input contracts. Each key is an "on an event" trigger option in the
 * create-workflow flow; the built-in `manual` / `periodic` modes need no entry.
 *
 * TODO: declare the app events that should start workflows, e.g.
 *   user_signed_up: { description: '…', inputSchema: z.object({ userId: z.string() }) }
 */
export const triggers: TriggerRegistry = {
  [CHAT_TRIGGER_KIND]: {
    description: 'A message was posted in a chat room',
    inputSchema: chatTriggerInputSchema,
  },
}
