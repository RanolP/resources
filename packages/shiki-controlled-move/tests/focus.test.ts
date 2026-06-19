import { describe, it, expect } from 'vitest'
import { matchPattern, L } from '../src/pattern.js'
import { compile } from '../src/compile.js'
import type { SourceLine, WorkingToken } from '../src/types.js'

function toks(...texts: string[]): WorkingToken[] {
  return texts.map((text, i) => ({ id: `t${i}`, text, color: '#000' }))
}

describe('focus sub-selection', () => {
  it('narrows the match to the nth occurrence of the focus pattern', () => {
    // map ( pair ( 1 )
    const tokens = toks('map', '(', 'pair', '(', '1', ')')
    const first = matchPattern('map(pair(', tokens, { pattern: '(', nth: 0 })
    expect(first).toHaveLength(1)
    expect(first[0].tokenIds).toEqual(['t1']) // the ( right after map
    const second = matchPattern('map(pair(', tokens, { pattern: '(', nth: 1 })
    expect(second[0].tokenIds).toEqual(['t3']) // the ( after pair
  })

  it('skips the match when the focus occurrence is absent', () => {
    const tokens = toks('map', '(', 'pair')
    expect(matchPattern('map(pair', tokens, { pattern: '(', nth: 5 })).toHaveLength(0)
  })

  it('foldTo with focus replaces only the focused token, leaving context intact', () => {
    const initial: SourceLine[] = [{
      tokens: [
        { text: 'map', color: '#000' },
        { text: '(', color: '#000' },
        { text: 'pair', color: '#000' },
        { text: '(', color: '#000' },
      ],
    }]
    const result = compile(initial, [[L[0]('map(pair(').focus('(').foldTo('∘')]])
    const lineId = result.lines[0].id
    const texts = result.lineTokens[lineId].map((id) => result.tokens.find((t) => t.id === id)!.text)
    // The first ( collapses, ∘ grows in its place; map / pair / second ( keep their identity
    expect(texts).toEqual(['map', '(', '∘', 'pair', '('])
    const oldParen = result.tokens.find((t) => t.text === '(' )!
    const morphed = result.tokens.find((t) => t.text === '∘')!
    expect(morphed.steps[1].opacity).toBe(1)
    expect(oldParen.steps[1].opacity).toBe(0)
  })
})
