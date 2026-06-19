import { describe, it, expect } from 'vitest'
import { compile } from '../src/compile.js'
import { L } from '../src/pattern.js'
import type { SourceLine } from '../src/types.js'

function lines(code: string): SourceLine[] {
  return code.split('\n').map((text) => ({ tokens: [{ text, color: '#000000' }] }))
}

describe('insert-tokens', () => {
  it('after().insert() inserts new tokens after an anchor, hidden->visible', () => {
    const result = compile(
      [{ tokens: [{ text: 'a', color: '#000' }, { text: 'b', color: '#000' }] }],
      [[L[0]('a').after().insert('X')]],
    )
    const x = result.tokens.find((t) => t.text === 'X')!
    expect(x.steps[0].opacity).toBe(0)
    expect(x.steps[1].opacity).toBe(1)
    expect(x.steps[1].maxWidth).toBe('1ch')
    const lineId = result.lines[0].id
    // DOM order: a, X, b
    const ids = result.lineTokens[lineId].map((id) => result.tokens.find((t) => t.id === id)!.text)
    expect(ids).toEqual(['a', 'X', 'b'])
  })

  it('before().insert() inserts before the anchor', () => {
    const result = compile(lines('z'), [[L[0]('z').before().insert('Q')]])
    const lineId = result.lines[0].id
    const ids = result.lineTokens[lineId].map((id) => result.tokens.find((t) => t.id === id)!.text)
    expect(ids).toEqual(['Q', 'z'])
  })
})
