import { describe, it, expect } from 'vitest'
import { matchPattern, L } from '../src/pattern.js'
import { compile } from '../src/compile.js'
import type { SourceLine, WorkingToken } from '../src/types.js'

function toks(...texts: string[]): WorkingToken[] {
  return texts.map((text, i) => ({ id: `t${i}`, text, color: '#000' }))
}

describe('nth occurrence selection', () => {
  it('selects only the nth match of the pattern', () => {
    const tokens = toks('map', ' ', 'map', ' ', 'map')
    expect(matchPattern('map', tokens).map((m) => m.tokenIds)).toEqual([['t0'], ['t2'], ['t4']])
    expect(matchPattern('map', tokens, undefined, 1)).toHaveLength(1)
    expect(matchPattern('map', tokens, undefined, 1)[0].tokenIds).toEqual(['t2'])
  })

  it('returns nothing when nth is out of range', () => {
    const tokens = toks('map', ' ', 'map')
    expect(matchPattern('map', tokens, undefined, 9)).toHaveLength(0)
  })

  it('L[n](pattern, nth) deletes only that occurrence', () => {
    const initial: SourceLine[] = [{
      tokens: [
        { text: 'map', color: '#000' },
        { text: ' ', color: '#000' },
        { text: 'map', color: '#000' },
      ],
    }]
    const result = compile(initial, [[L[0]('map', 1).delete()]])
    const maps = result.tokens.filter((t) => t.text === 'map')
    // first map stays visible, second map is deleted
    expect(maps[0].steps[1].opacity).toBe(1)
    expect(maps[1].steps[1].opacity).toBe(0)
  })
})
