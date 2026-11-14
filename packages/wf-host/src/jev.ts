import {
  questionChoices,
  type BooleanQuestion,
  type Decider,
  type DecisionAnswer,
  type DecisionDistributionEntry,
  type DecisionQuestion,
  type DecisionRequest,
  type DecisionResponse,
} from '@stevepeak/007'
import { z } from 'zod'

/**
 * The Jev adapter — the ONE place TypeSafe's vocabulary exists.
 *
 * Jev is a decision model: text plus typed questions in, a probability
 * distribution per question out, never prose. It is served by OpenRouter on its
 * own endpoint (`POST /api/alpha/decisions`, model `typesafe/jev-1.13`), NOT
 * through `/chat/completions` — which is why it is wired as the SDK's second
 * kind of provider (`getDecider`) and deliberately stays out of `listModels`.
 * An author who picked it in a model dropdown would 404 mid-run.
 *
 * Everything above this file speaks the SDK's contract (`boolean` / `category` /
 * `scale`, a distribution per question). Jev's own words — `noul`, `choice`,
 * `score`, `criteria`, `legend` — stop here.
 *
 * ── What is translated, and what must not be ─────────────────────────────────
 * The SDK's rule is that providers REPORT and the engine DECIDES: a decider
 * returns probabilities and nothing else, and `resolveVerdicts` computes the
 * winner, the threshold, a scale's weighted index and `confidence`. So two
 * things Jev offers are dropped on purpose:
 *
 *   • `choice` / `score` — the chosen option and the weighted score. The engine
 *     derives both from the distribution we return.
 *   • `confidence`. Jev's is real but it is its own concentration measure, not a
 *     calibrated number, and the engine already derives a confidence — the
 *     margin between the top two probabilities — from the same distribution.
 *     Passing Jev's through would mean a threshold an author wrote against a
 *     decision agent judged by Jev meant something different from the same
 *     threshold judged by any other provider. (Jev's `noul` has no confidence
 *     field at all, so half the answers would carry one and half wouldn't.)
 *
 * The probabilities themselves ARE calibrated — that is Jev's whole claim, and
 * why the catalog marks it `calibrated: true` where a chat-emulated decider
 * cannot be.
 */

const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions'

/**
 * Jev's cap on a `score` question's levels. Checked here rather than left to the
 * API so an author who added an eleventh level reads what is wrong with their
 * node instead of a 400 from a vendor they never heard of.
 */
const MAX_SCALE_LEVELS = 10

/**
 * One question, in Jev's shape. `criteria` is a description per option for a
 * `choice`, an ORDERED array of level descriptions for a `score`, and absent for
 * a `noul`.
 */
type JevQuestion = {
  type: 'noul' | 'choice' | 'score'
  instructions: string
  criteria?: Record<string, string> | string[]
}

const jevAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('noul'),
    /** Probability the proposition holds, 0–1. */
    noul: z.number(),
  }),
  z.object({
    type: z.literal('choice'),
    choice: z.string(),
    /** Keyed by the option keys we sent in `criteria`. */
    probabilities: z.record(z.string(), z.number()),
    confidence: z.number().optional(),
  }),
  z.object({
    type: z.literal('score'),
    score: z.number(),
    /** Level index → the description we sent. Informational only — see below. */
    legend: z.record(z.string(), z.string()).optional(),
    /** Keyed by level ORDINAL as a string: `{"0": 0, "1": 0.85, "2": 0.15}`. */
    probabilities: z.record(z.string(), z.number()),
    confidence: z.number().optional(),
  }),
])

const jevResponseSchema = z.object({
  /**
   * The exact snapshot that answered, e.g. `typesafe/jev-1.13-20260917`. Worth
   * recording precisely because `~typesafe/jev-latest` floats.
   */
  model: z.string().optional(),
  answers: z.record(z.string(), jevAnswerSchema),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
})

/**
 * A `boolean` question as one `noul` instruction. Jev has no field for the
 * SDK's `yesMeans` / `noMeans`, so they are folded into the instructions — the
 * only place meaning can live, since Jev is never sent the question's id.
 */
function booleanInstructions(question: BooleanQuestion): string {
  return [
    question.prompt,
    ...(question.yesMeans ? [`Yes means: ${question.yesMeans}`] : []),
    ...(question.noMeans ? [`No means: ${question.noMeans}`] : []),
  ].join('\n')
}

function toJevQuestion(question: DecisionQuestion): JevQuestion {
  if (question.type === 'boolean') {
    return { type: 'noul', instructions: booleanInstructions(question) }
  }
  const choices = questionChoices(question)
  if (question.type === 'category') {
    return {
      type: 'choice',
      instructions: question.prompt,
      // Jev reads the descriptions to tell the options apart and never sees the
      // question id, so an undescribed option is sent under its own key rather
      // than as an empty string.
      criteria: Object.fromEntries(
        choices.map((c) => [c.key, c.description ?? c.key]),
      ),
    }
  }
  if (choices.length > MAX_SCALE_LEVELS) {
    throw new Error(
      `Jev scores at most ${MAX_SCALE_LEVELS} levels; question '${question.id}' has ${choices.length}.`,
    )
  }
  return {
    type: 'score',
    instructions: question.prompt,
    // The ORDER is the scale — Jev answers by ordinal, and the engine computes
    // the weighted index positionally, so this array and the question's levels
    // must stay in lockstep.
    criteria: choices.map((c) => c.description ?? c.key),
  }
}

/**
 * A distribution over the QUESTION's own keys, read out of Jev's map.
 *
 * Every key the question declared appears, in the question's order, so a
 * missing entry reads as zero probability rather than shortening the
 * distribution (which would misalign a scale's indices and measure confidence
 * against a runner-up that isn't there).
 *
 * `lookup` is where the two shapes differ: a `choice` is keyed by the option
 * keys we sent, a `score` by ordinal index. A score is mapped through the
 * level ORDER and never through `legend`'s labels, which collide the moment two
 * levels are described the same way.
 */
function toDistribution(args: {
  question: DecisionQuestion
  probabilities: Record<string, number>
  lookup: (args: { key: string; index: number }) => number | undefined
}): DecisionDistributionEntry[] {
  const choices = questionChoices(args.question)
  const distribution = choices.map((choice, index) => ({
    key: choice.key,
    probability: args.lookup({ key: choice.key, index }) ?? 0,
  }))
  const total = distribution.reduce((sum, d) => sum + d.probability, 0)
  if (total <= 0) {
    // All mass landed on keys the question never declared. Left alone this
    // resolves to the first choice while looking perfectly healthy, so it fails
    // loudly instead.
    throw new Error(
      `Jev answered question '${args.question.id}' with keys the question does not declare (got ${Object.keys(
        args.probabilities,
      ).join(', ')}; expected ${choices.map((c) => c.key).join(', ')}).`,
    )
  }
  return distribution
}

function toAnswer(args: {
  question: DecisionQuestion
  answer: z.infer<typeof jevAnswerSchema> | undefined
}): DecisionAnswer {
  const { question, answer } = args
  // `resolveVerdicts` throws on a missing or mistyped answer too, but it can
  // only say the answer is absent; this says who was asked and what came back.
  if (!answer) {
    throw new Error(`Jev returned no answer for question '${question.id}'.`)
  }
  if (question.type === 'boolean') {
    if (answer.type !== 'noul') {
      throw new Error(
        `Jev answered boolean question '${question.id}' as a ${answer.type}.`,
      )
    }
    return { id: question.id, type: 'boolean', probability: answer.noul }
  }
  if (question.type === 'category') {
    if (answer.type !== 'choice') {
      throw new Error(
        `Jev answered category question '${question.id}' as a ${answer.type}.`,
      )
    }
    return {
      id: question.id,
      type: 'category',
      distribution: toDistribution({
        question,
        probabilities: answer.probabilities,
        lookup: ({ key }) => answer.probabilities[key],
      }),
    }
  }
  if (answer.type !== 'score') {
    throw new Error(
      `Jev answered scale question '${question.id}' as a ${answer.type}.`,
    )
  }
  return {
    id: question.id,
    type: 'scale',
    distribution: toDistribution({
      question,
      probabilities: answer.probabilities,
      lookup: ({ index }) => answer.probabilities[String(index)],
    }),
  }
}

export type JevDeciderOptions = {
  /** OpenRouter key — the same one the chat models use. */
  apiKey: string
  /** Jev model id, e.g. `typesafe/jev-1.13`. Provider-native, unprefixed. */
  modelId: string
}

/**
 * A {@link Decider} over Jev on OpenRouter.
 *
 * No `maxQuestionsPerCall`: Jev takes as many questions as fit its budget (64k
 * per request, 32k of it for the state plus the longest question), so it caps by
 * tokens and not by count. A made-up number here would split requests that
 * would have fit while still failing the ones that don't.
 */
export function createJevDecider(options: JevDeciderOptions): Decider {
  return async (request: DecisionRequest): Promise<DecisionResponse> => {
    if (request.questions.length === 0) {
      return { modelId: options.modelId, answers: [] }
    }

    const res = await fetch(DECISIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.modelId,
        state: request.state,
        questions: Object.fromEntries(
          request.questions.map((q) => [q.id, toJevQuestion(q)]),
        ),
      }),
    })
    if (!res.ok) {
      // The body carries the field-level complaint, which is the whole
      // diagnosis when a question was malformed.
      throw new Error(
        `Jev decisions failed: ${res.status} ${res.statusText} — ${(
          await res.text()
        ).slice(0, 500)}`,
      )
    }

    const body = jevResponseSchema.parse(await res.json())
    return {
      // What ACTUALLY answered, not what we asked with.
      modelId: body.model ?? options.modelId,
      answers: request.questions.map((question) => {
        return toAnswer({ question, answer: body.answers[question.id] })
      }),
      usage: {
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens,
      },
    }
  }
}
