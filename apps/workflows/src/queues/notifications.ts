/**
 * Notifications queue consumer.
 *
 * Batched delivery with auto-retry. Failed messages bounce up to
 * `max_retries` times (configured in wrangler.jsonc) before landing in the
 * dead-letter queue.
 *
 * To trigger one locally:
 *   curl -X POST http://localhost:8787/__queues/kyoto-notifications \
 *     -H 'content-type: application/json' \
 *     -d '{"messages":[{"body":{"kind":"email","to":"a@b.c","subject":"hi"}}]}'
 */
export async function handleNotificationsBatch(
  batch: MessageBatch<unknown>,
  _env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await deliver(message.body)
      message.ack()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[notifications] delivery failed', err)
      message.retry({ delaySeconds: 30 })
    }
  }
}

async function deliver(body: unknown): Promise<void> {
  // Plug in Resend / Postmark / SES / Slack / whatever here. For now we just
  // log so the local dev story is observable.
  // eslint-disable-next-line no-console
  console.log('[notifications] delivering', body)
}
