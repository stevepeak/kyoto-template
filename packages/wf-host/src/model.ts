import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { ModelOption, ModelProvider, RunContext } from '@stevepeak/007'
import type { LanguageModel } from 'ai'

import type { HostEnv } from './env'

const OPENROUTER_PROVIDER_ID = 'openrouter'

/**
 * The models offered in the editor's pickers. Ids are composite
 * `providerId:modelId` so they route back through `getModel`.
 *
 * TODO: choose the model provider(s) and the models to offer.
 */
const MODELS: { id: string; label: string }[] = [
  { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5' },
]

export function listProviders(): ModelProvider[] {
  return [
    { id: OPENROUTER_PROVIDER_ID, label: 'OpenRouter', kind: 'openrouter' },
  ]
}

export function listModels(): ModelOption[] {
  return MODELS.map((m) => ({
    id: `${OPENROUTER_PROVIDER_ID}:${m.id}`,
    label: m.label,
    providerId: OPENROUTER_PROVIDER_ID,
  }))
}

/**
 * `WfSdkConfig.getModel` — the provider boundary. Runs inside a step, so the
 * key comes from the live env, never module scope. An unprefixed id is treated
 * as OpenRouter.
 */
export function getModel(id: string, ctx: RunContext): LanguageModel {
  const env = ctx.env as HostEnv
  const sep = id.indexOf(':')
  const providerId = sep === -1 ? OPENROUTER_PROVIDER_ID : id.slice(0, sep)
  const modelId = sep === -1 ? id : id.slice(sep + 1)
  if (providerId !== OPENROUTER_PROVIDER_ID) {
    throw new Error(`Unknown model provider: ${providerId}`)
  }
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to the workflows/web Worker env.',
    )
  }
  // TODO: decide on provider data-collection policy (e.g.
  // `{ provider: { data_collection: 'deny' } }`).
  return createOpenRouter({ apiKey: env.OPENROUTER_API_KEY }).chat(modelId)
}
