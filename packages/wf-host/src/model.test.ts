import { describe, expect, test } from 'bun:test'

import type { RunContext } from '@stevepeak/007'

import { getModel, listModels } from './model'

describe('model provider', () => {
  test('every listed model routes back through getModel', () => {
    const ctx = { env: { OPENROUTER_API_KEY: 'sk-or-v1-test' } } as RunContext
    for (const m of listModels()) {
      expect(getModel(m.id, ctx)).toBeTruthy()
    }
  })

  test('a missing key fails with an actionable message', () => {
    const ctx = { env: {} } as RunContext
    expect(() => getModel('openrouter:x/y', ctx)).toThrow('OPENROUTER_API_KEY')
  })
})
