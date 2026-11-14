import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type {
  ModelCatalogEntry,
  ModelListContext,
  ModelOption,
  ModelProvider,
  ProviderBudget,
  RunContext,
} from '@stevepeak/007'
import type { LanguageModel } from 'ai'
import { z } from 'zod'

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

const OPENROUTER_API = 'https://openrouter.ai/api/v1'

function openRouterKey(ctx: ModelListContext): string {
  const key = (ctx.env as HostEnv | undefined)?.OPENROUTER_API_KEY
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to the workflows/web Worker env.',
    )
  }
  return key
}

/** OpenRouter prices are USD-per-token strings; convert to USD per 1M tokens. */
const perMTok = z
  .string()
  .optional()
  .transform((v) => {
    const n = v == null ? NaN : Number(v)
    return Number.isFinite(n) && n >= 0 ? n * 1_000_000 : undefined
  })

const openRouterModelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      created: z.number().optional(),
      context_length: z.number().nullish(),
      pricing: z
        .object({ prompt: perMTok, completion: perMTok })
        .partial()
        .optional(),
      architecture: z
        .object({ input_modalities: z.array(z.string()).optional() })
        .optional(),
      supported_parameters: z.array(z.string()).optional(),
    }),
  ),
})

/**
 * `WfSdkConfig.fetchModelCatalog` — the Models page "Refresh". Pulls
 * OpenRouter's live `/models`; the SDK upserts the rows and owns `enabled`.
 */
export async function fetchModelCatalog(
  ctx: ModelListContext,
  providerId: string,
): Promise<Omit<ModelCatalogEntry, 'enabled'>[]> {
  if (providerId !== OPENROUTER_PROVIDER_ID) return []
  const res = await fetch(`${OPENROUTER_API}/models`, {
    headers: { Authorization: `Bearer ${openRouterKey(ctx)}` },
  })
  if (!res.ok) throw new Error(`OpenRouter /models failed: ${res.status}`)
  const { data } = openRouterModelsSchema.parse(await res.json())
  return data.map((m) => {
    const params = new Set(m.supported_parameters ?? [])
    const prompt = m.pricing?.prompt
    const completion = m.pricing?.completion
    return {
      id: `${OPENROUTER_PROVIDER_ID}:${m.id}`,
      modelId: m.id,
      label: m.name,
      providerId: OPENROUTER_PROVIDER_ID,
      vendor: m.id.split('/')[0],
      contextLength: m.context_length ?? undefined,
      releasedAt: m.created != null ? m.created * 1000 : undefined,
      promptPricePerMTok: prompt,
      completionPricePerMTok: completion,
      // TODO: weight the blend toward your real prompt:completion ratio.
      costPerMTok:
        prompt != null && completion != null
          ? (prompt + completion) / 2
          : undefined,
      capabilities: {
        tools: params.has('tools'),
        reasoning: params.has('reasoning') || params.has('reasoning_effort'),
        structuredOutput: params.has('structured_outputs'),
        vision: (m.architecture?.input_modalities ?? []).some(
          (x) => x !== 'text',
        ),
      },
    }
  })
}

const openRouterKeySchema = z.object({
  data: z.object({
    limit: z.number().nullish(),
    limit_remaining: z.number().nullish(),
    limit_reset: z.string().nullish(),
    usage: z.number().nullish(),
    label: z.string().optional(),
    is_free_tier: z.boolean().optional(),
  }),
})

/** `WfSdkConfig.fetchProviderBudget` — remaining credit on the OpenRouter key. */
export async function fetchProviderBudget(
  ctx: ModelListContext,
  providerId: string,
): Promise<ProviderBudget | null> {
  if (providerId !== OPENROUTER_PROVIDER_ID) return null
  const res = await fetch(`${OPENROUTER_API}/key`, {
    headers: { Authorization: `Bearer ${openRouterKey(ctx)}` },
  })
  if (!res.ok) throw new Error(`OpenRouter /key failed: ${res.status}`)
  const { data } = openRouterKeySchema.parse(await res.json())
  return {
    providerId,
    status: 'ok',
    remaining: data.limit_remaining ?? null,
    limit: data.limit ?? null,
    usage: data.usage ?? null,
    resetInterval: data.limit_reset ?? null,
    keyLabel: data.label,
    isFreeTier: data.is_free_tier,
  }
}
