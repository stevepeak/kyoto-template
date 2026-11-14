import type {
  Decider,
  DecisionModelOption,
  DecisionProvider,
  RunContext,
} from '@stevepeak/007'

import type { HostEnv } from './env'
import { createJevDecider } from './jev'

// The decision layer — the peer of `model.ts`, for the SDK's OTHER kind of
// provider. A chat model takes messages and answers with text; a decider takes
// one state plus typed questions and answers with probability distributions.
//
// Wiring it turns on two surfaces at once: **decision agents** (a question set
// as a versioned entity, rolled up to one verdict by ordered rules, run through
// an ordinary agent node) and the **`decision_judge`** eval check (a Goal graded
// on a probability instead of an LLM rating its own verdict). Unwired, both are
// simply absent.
//
// One provider today: TypeSafe's **Jev**, served by OpenRouter on its own
// `POST /api/alpha/decisions` endpoint. It reads the SAME `OPENROUTER_API_KEY`
// the chat models use, which is the whole reason it is cheap to wire — no new
// secret, no new account. The adapter lives in `jev.ts`; this file only says
// which deciders exist and hands one back.
//
// `decisionsViaChatModels` (the SDK's emulate-over-chat-models flag) is
// deliberately NOT set: Jev is a real decision endpoint with calibrated
// probabilities, and setting the flag alongside `getDecider` is a construction
// error rather than a fallback.

const DECISION_PROVIDER_ID = 'openrouter'

/**
 * The pinned Jev snapshot — as the FIRST catalog entry, the fallback
 * `decision_judge` grades with when a check names no model of its own.
 */
export const JEV_MODEL_ID = `${DECISION_PROVIDER_ID}:typesafe/jev-1.13`

/**
 * The floating alias. Offered as well as the pin because a decision agent is
 * cheap to re-run and an author may want the newest Jev; the run record keeps
 * whatever snapshot actually answered, so a float never hides which model
 * produced a verdict.
 */
const JEV_LATEST_MODEL_ID = `${DECISION_PROVIDER_ID}:~typesafe/jev-latest`

/**
 * Jev's request budget is 64k tokens, 32k of it for the state plus the longest
 * question. The editor shows the state's share, which is the one an author
 * bumps into.
 */
const JEV_STATE_TOKENS = 32_000

/**
 * USD per 1M tokens. Jev bills INPUT only — answers are free and tiny — so the
 * input rate is the price, not half of a blend.
 */
const JEV_COST_PER_MTOK = 0.042

const DECISION_MODELS: DecisionModelOption[] = [
  {
    id: JEV_MODEL_ID,
    label: 'Jev 1.13',
    providerId: DECISION_PROVIDER_ID,
    questionTypes: ['boolean', 'category', 'scale'],
    // Jev's probabilities are genuinely calibrated — 0.8 means right about 80%
    // of the time, in aggregate — which is what a confidence threshold authored
    // against this node is thresholding. A chat-emulated decider cannot claim
    // this, and the editor badges the difference.
    calibrated: true,
    costPerMTok: JEV_COST_PER_MTOK,
    contextLength: JEV_STATE_TOKENS,
    // No `maxQuestionsPerCall`: Jev caps by tokens, not by question count — see
    // `createJevDecider`.
  },
  {
    id: JEV_LATEST_MODEL_ID,
    label: 'Jev (latest)',
    providerId: DECISION_PROVIDER_ID,
    questionTypes: ['boolean', 'category', 'scale'],
    calibrated: true,
    costPerMTok: JEV_COST_PER_MTOK,
    contextLength: JEV_STATE_TOKENS,
  },
]

/**
 * `WfSdkConfig.listDecisionProviders` — how a decision agent's model dropdown is
 * grouped. Same id as the chat provider on purpose: it is one OpenRouter
 * account and one key, reached through two endpoints.
 */
export function listDecisionProviders(): DecisionProvider[] {
  return [
    {
      id: DECISION_PROVIDER_ID,
      label: 'OpenRouter',
      // A purpose-built decision endpoint, not a chat model in a hat.
      kind: 'native',
      note: "TypeSafe's Jev, on OpenRouter's Decisions API — the same key as the chat models.",
    },
  ]
}

/**
 * `WfSdkConfig.listDecisionModels` — exactly the deciders `getDecider` below can
 * resolve. Read straight from here with no DB layer: unlike the chat catalog
 * there is nothing for an admin page to enable, because a host either wired a
 * decider or it didn't.
 */
export function listDecisionModels(): DecisionModelOption[] {
  return DECISION_MODELS
}

/**
 * `WfSdkConfig.getDecider` — the decision-provider boundary, and the gate on the
 * whole feature. Ids are composite `providerId:modelId`, like a chat model ref.
 *
 * An unprefixed id gets no OpenRouter fallback here (the one `getModel` keeps for
 * configs saved before providers existed): decision agents are new, so every
 * saved `modelId` came from the catalog above, and a bare id is a mistake worth
 * naming rather than routing.
 */
export function getDecider(id: string, ctx: RunContext): Decider {
  const prefix = `${DECISION_PROVIDER_ID}:`
  if (!id.startsWith(prefix)) {
    throw new Error(
      `Unknown decision model: ${id}. Ids are \`providerId:modelId\` — see listDecisionModels in wf-host/src/decider.ts.`,
    )
  }
  const env = ctx.env as HostEnv
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API key is not set. Add it to the host env (see wf-host/src/env.ts).',
    )
  }
  return createJevDecider({
    apiKey: env.OPENROUTER_API_KEY,
    modelId: id.slice(prefix.length),
  })
}
