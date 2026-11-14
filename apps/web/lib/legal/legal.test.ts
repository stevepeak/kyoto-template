import { describe, expect, test } from 'bun:test'

import type { DocumentBlock } from './blocks'
import { PRIVACY_POLICY } from './privacy-policy'
import { TERMS_OF_USE } from './terms-of-use'

function blockText(block: DocumentBlock): string[] {
  switch (block.kind) {
    case 'list':
      return [...block.items]
    case 'section':
      return [block.heading, block.text]
    default:
      return [block.text]
  }
}

describe.each([
  ['privacy policy', PRIVACY_POLICY],
  ['terms of use', TERMS_OF_USE],
])('%s', (_name, document) => {
  test('every block has non-empty text', () => {
    expect(document.blocks.length).toBeGreaterThan(0)
    for (const block of document.blocks) {
      const parts = blockText(block)
      expect(parts.length).toBeGreaterThan(0)
      for (const part of parts) expect(part.trim()).not.toBe('')
    }
  })

  test('opens with its title', () => {
    expect(document.blocks[0]).toEqual({
      kind: 'title',
      text: document.title,
    })
  })

  test('section numbers run 1..n in order', () => {
    const numbers = document.blocks
      .filter((b) => b.kind === 'section')
      .map((b) => b.number)
    expect(numbers).toEqual(numbers.map((_, i) => i + 1))
  })

  // Flips when counsel's real text lands — update the version then.
  test('is still flagged as a placeholder draft', () => {
    expect(document.version).toContain('placeholder')
  })
})
