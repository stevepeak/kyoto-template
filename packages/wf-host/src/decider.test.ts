import {
  resolveVerdicts,
  type DecisionQuestion,
  type RunContext,
} from '@stevepeak/007'
import { afterEach, describe, expect, it, mock } from 'bun:test'

import { getDecider, listDecisionModels, JEV_MODEL_ID } from './decider'
import { createJevDecider } from './jev'

// ---------------------------------------------------------------------------
// The Jev adapter is the only place a vendor's answer shape is translated into
// the SDK's, and every way it can be wrong is SILENT:
//
//   • a distribution keyed by something the question never declared resolves to
//     the first choice while looking perfectly healthy;
//   • a scale mapped by label instead of by ORDER produces a plausible weighted
//     index that is simply wrong;
//   • passing the provider's own `confidence` through makes a threshold an
//     author wrote mean something different from the same threshold on any other
//     provider.
//
// Nothing typechecks any of that, so it is tested here. No network: `fetch` is
// stubbed with real response bodies from OpenRouter's Decisions API.
// ---------------------------------------------------------------------------

const MODEL_ID = 'typesafe/jev-1.13'
const SNAPSHOT = 'typesafe/jev-1.13-20260917'

type JevBody = {
  model: string
  state: unknown
  questions: Record<
    string,
    { type: string; instructions: string; criteria?: unknown }
  >
}

const realFetch = globalThis.fetch

function stubFetch(impl: (url: string, init: { body: string }) => unknown) {
  globalThis.fetch = mock(impl) as unknown as typeof fetch
}

/** Stub `fetch` with one Jev response; returns what the adapter sent. */
function stubJev(payload: unknown): { request: () => JevBody } {
  let sent: JevBody | undefined
  stubFetch((_url: string, init: { body: string }) => {
    sent = JSON.parse(init.body) as JevBody
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    })
  })
  return {
    request: () => {
      if (!sent) throw new Error('the adapter never called Jev')
      return sent
    },
  }
}

const decide = createJevDecider({ apiKey: 'k', modelId: MODEL_ID })

const usage = { input_tokens: 357, output_tokens: 38, cost: 0.000014994 }

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('boolean → noul', () => {
  const question: DecisionQuestion = {
    id: 'is_mep',
    type: 'boolean',
    prompt: 'Is this a mise en place rather than a plated dish?',
    yesMeans: 'Names a batch yield rather than portions',
  }

  it('sends one noul question, with yesMeans folded in', async () => {
    const jev = stubJev({
      model: SNAPSHOT,
      answers: { is_mep: { type: 'noul', noul: 0.82 } },
      usage,
    })
    await decide({ state: 'Tomato sugo, 4 L', questions: [question] })

    const sent = jev.request().questions.is_mep
    expect(sent.type).toBe('noul')
    // Jev is never sent the question id, so a yesMeans that stayed out of
    // `instructions` would simply never reach the model.
    expect(sent.instructions).toContain('mise en place')
    expect(sent.instructions).toContain(
      'Yes means: Names a batch yield rather than portions',
    )
    expect(sent.criteria).toBeUndefined()
  })

  it('reports the probability, the snapshot that answered, and usage', async () => {
    stubJev({
      model: SNAPSHOT,
      answers: { is_mep: { type: 'noul', noul: 0.82 } },
      usage,
    })
    const res = await decide({ state: 'Tomato sugo', questions: [question] })

    expect(res.answers).toEqual([
      { id: 'is_mep', type: 'boolean', probability: 0.82 },
    ])
    // The pinned id we asked with was `jev-1.13`; the run record gets the exact
    // snapshot that answered.
    expect(res.modelId).toBe(SNAPSHOT)
    expect(res.usage).toEqual({ inputTokens: 357, outputTokens: 38 })
  })
})

describe('category → choice', () => {
  const question: DecisionQuestion = {
    id: 'course',
    type: 'category',
    prompt: 'Which course is this dish?',
    options: [
      { key: 'starter', description: 'Served first, small' },
      { key: 'main', description: 'The plate the meal is built around' },
      { key: 'dessert' },
    ],
  }

  it('sends a criteria map, falling back to the key when undescribed', async () => {
    const jev = stubJev({
      model: SNAPSHOT,
      answers: {
        course: {
          type: 'choice',
          choice: 'main',
          probabilities: { starter: 0.19, main: 0.79, dessert: 0.02 },
          confidence: 0.69,
        },
      },
      usage,
    })
    await decide({ state: 'Braised short rib', questions: [question] })

    expect(jev.request().questions.course).toEqual({
      type: 'choice',
      instructions: 'Which course is this dish?',
      criteria: {
        starter: 'Served first, small',
        main: 'The plate the meal is built around',
        // All the meaning has to be in the descriptions — an empty one would
        // ask Jev to tell the options apart on nothing.
        dessert: 'dessert',
      },
    })
  })

  it("returns the distribution in the QUESTION's order, whatever order Jev answers in", async () => {
    stubJev({
      model: SNAPSHOT,
      answers: {
        course: {
          type: 'choice',
          choice: 'main',
          // Jev's key order shifts between calls, and `dessert` is missing here.
          probabilities: { main: 0.79, starter: 0.21 },
          confidence: 0.69,
        },
      },
      usage,
    })
    const res = await decide({
      state: 'Braised short rib',
      questions: [question],
    })

    expect(res.answers[0]).toEqual({
      id: 'course',
      type: 'category',
      distribution: [
        { key: 'starter', probability: 0.21 },
        { key: 'main', probability: 0.79 },
        // Present at zero rather than dropped: a short distribution measures
        // confidence against a runner-up that isn't there.
        { key: 'dessert', probability: 0 },
      ],
    })
  })

  it("drops Jev's confidence so the engine's margin is what an author thresholds", async () => {
    stubJev({
      model: SNAPSHOT,
      answers: {
        course: {
          type: 'choice',
          choice: 'main',
          probabilities: { starter: 0.19, main: 0.79, dessert: 0.02 },
          // Jev's own concentration measure. Passing it through would make this
          // node's 0.7 mean something other than every other provider's 0.7.
          confidence: 0.69,
        },
      },
      usage,
    })
    const res = await decide({
      state: 'Braised short rib',
      questions: [question],
    })

    expect(res.answers[0].confidence).toBeUndefined()
    const verdict = resolveVerdicts([question], res.answers).course
    // The SDK's one definition: the margin between the top two probabilities.
    expect(verdict.confidence).toBeCloseTo(0.6, 5)
    expect(verdict.value).toBe('main')
  })

  it('fails loudly when the distribution names keys the question never declared', async () => {
    stubJev({
      model: SNAPSHOT,
      answers: {
        course: {
          type: 'choice',
          choice: 'Main',
          probabilities: { Starter: 0.19, Main: 0.79, Dessert: 0.02 },
        },
      },
      usage,
    })
    await expect(
      decide({ state: 'Braised short rib', questions: [question] }),
    ).rejects.toThrow(/does not declare/)
  })
})

describe('scale → score', () => {
  // Two levels described identically on purpose: mapping the answer back through
  // `legend`'s labels instead of through the level ORDER collides here, and the
  // weighted index comes out wrong while looking fine.
  const question: DecisionQuestion = {
    id: 'prep_effort',
    type: 'scale',
    prompt: 'How much prep does this dish need?',
    levels: [
      { key: 'low', description: 'Assembly only' },
      { key: 'medium', description: 'Some knife work' },
      { key: 'high', description: 'Some knife work' },
    ],
  }

  it('sends the levels as an ordered array', async () => {
    const jev = stubJev({
      model: SNAPSHOT,
      answers: {
        prep_effort: {
          type: 'score',
          score: 1.15,
          legend: {
            '0': 'Assembly only',
            '1': 'Some knife work',
            '2': 'Some knife work',
          },
          probabilities: { '0': 0, '1': 0.85, '2': 0.15 },
          confidence: 0.77,
        },
      },
      usage,
    })
    await decide({ state: 'Beef bourguignon', questions: [question] })

    expect(jev.request().questions.prep_effort).toEqual({
      type: 'score',
      instructions: 'How much prep does this dish need?',
      criteria: ['Assembly only', 'Some knife work', 'Some knife work'],
    })
  })

  it('maps the ordinal keys back through the level order, not the legend', async () => {
    stubJev({
      model: SNAPSHOT,
      answers: {
        prep_effort: {
          type: 'score',
          score: 1.15,
          legend: {
            '0': 'Assembly only',
            '1': 'Some knife work',
            '2': 'Some knife work',
          },
          probabilities: { '0': 0, '1': 0.85, '2': 0.15 },
          confidence: 0.77,
        },
      },
      usage,
    })
    const res = await decide({
      state: 'Beef bourguignon',
      questions: [question],
    })

    expect(res.answers[0]).toEqual({
      id: 'prep_effort',
      type: 'scale',
      distribution: [
        { key: 'low', probability: 0 },
        { key: 'medium', probability: 0.85 },
        { key: 'high', probability: 0.15 },
      ],
    })
    // The engine computes the weighted index — and lands where Jev's own `score`
    // said, which is the check that the order survived the round trip.
    expect(
      resolveVerdicts([question], res.answers).prep_effort.value,
    ).toBeCloseTo(1.15, 5)
  })

  it('refuses more levels than Jev can score, before spending a call', async () => {
    stubJev({ model: SNAPSHOT, answers: {}, usage })
    const eleven: DecisionQuestion = {
      id: 'too_many',
      type: 'scale',
      prompt: 'How much?',
      levels: Array.from({ length: 11 }, (_, i) => ({ key: `l${i}` })),
    }
    await expect(decide({ state: 'x', questions: [eleven] })).rejects.toThrow(
      /at most 10 levels/,
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('answers that do not line up with the questions', () => {
  const question: DecisionQuestion = {
    id: 'is_mep',
    type: 'boolean',
    prompt: 'Is this a mise en place?',
  }

  it('names the question Jev skipped', async () => {
    stubJev({ model: SNAPSHOT, answers: {}, usage })
    await expect(decide({ state: 'x', questions: [question] })).rejects.toThrow(
      /no answer for question 'is_mep'/,
    )
  })

  it('names a question answered as the wrong type', async () => {
    stubJev({
      model: SNAPSHOT,
      answers: {
        is_mep: { type: 'choice', choice: 'yes', probabilities: { yes: 1 } },
      },
      usage,
    })
    await expect(decide({ state: 'x', questions: [question] })).rejects.toThrow(
      /answered boolean question 'is_mep' as a choice/,
    )
  })

  it('surfaces the provider’s own complaint on a failed request', async () => {
    stubFetch(() => {
      return Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('questions.is_mep: unknown type'),
      })
    })
    await expect(decide({ state: 'x', questions: [question] })).rejects.toThrow(
      /400 Bad Request — questions.is_mep: unknown type/,
    )
  })

  it('asks nothing when there is nothing to ask', async () => {
    stubJev({ model: SNAPSHOT, answers: {}, usage })
    await expect(decide({ state: 'x', questions: [] })).resolves.toEqual({
      modelId: MODEL_ID,
      answers: [],
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('the decision catalog', () => {
  const ctx: RunContext = {
    triggerKind: 'manual',
    env: { OPENROUTER_API_KEY: 'k' },
  }

  // `decision_judge` eval checks that name no model of their own grade with the
  // FIRST entry, so the pinned snapshot has to lead the floating alias.
  it('leads with the pinned model, which is what evals default to', () => {
    expect(listDecisionModels()[0]?.id).toBe(JEV_MODEL_ID)
    expect(JEV_MODEL_ID).toContain('jev-1.13')
  })

  it('offers only ids `getDecider` can resolve', () => {
    for (const model of listDecisionModels()) {
      expect(() => getDecider(model.id, ctx), model.id).not.toThrow()
    }
  })

  it('rejects an id from no provider rather than routing it', () => {
    // The `getModel` bare-id fallback deliberately has no counterpart here.
    expect(() => getDecider('typesafe/jev-1.13', ctx)).toThrow(
      /Unknown decision model/,
    )
  })

  it('says which key is missing when OpenRouter is unconfigured', () => {
    expect(() => {
      return getDecider(JEV_MODEL_ID, { triggerKind: 'manual', env: {} })
    }).toThrow(/OpenRouter API key is not set/)
  })
})
